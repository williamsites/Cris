/**
 * Verificação end-to-end de um SaaS já publicado no Cloudflare.
 * Uso: BASE_URL=https://seu-site.freebuff.page node node_modules/.cache/deployed.test.cjs
 */
import { buildSeed } from '../src/data/seed';
import { getSlots } from '../src/lib/scheduling';
import { addDays, todayISO, weekdayOf } from '../src/lib/utils';

const BASE = process.env.BASE_URL || '';
if (!BASE) {
  console.error('Informe BASE_URL');
  process.exit(1);
}

let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, extra = '') => {
  if (cond) pass++;
  else fails.push(`${name}${extra ? ' → ' + extra : ''}`);
};

async function call(path: string, init: RequestInit & { token?: string } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (init.token) headers.authorization = `Bearer ${init.token}`;
  const res = await fetch(BASE + path, { method: init.method || 'GET', headers, body: init.body });
  const text = await res.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { /* html */ }
  return { status: res.status, data, text, type: res.headers.get('content-type') || '' };
}

/* 1 · site e PWA */
const home = await fetch(BASE + '/');
const html = await home.text();
ok('home responde 200 com HTML', home.status === 200 && (home.headers.get('content-type') || '').includes('text/html'), String(home.status));
ok('home contém o app (id="root")', html.includes('id="root"'));
ok('home traz título da Cris Barber', /Cris Barber/.test(html));
const js = html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0];
const css = html.match(/\/assets\/index-[A-Za-z0-9_-]+\.css/)?.[0];
if (js) {
  const r = await fetch(BASE + js);
  ok('bundle JS é servido como javascript', r.status === 200 && (r.headers.get('content-type') || '').includes('javascript'), String(r.status));
}
if (css) {
  const r = await fetch(BASE + css);
  ok('CSS é servido como text/css', r.status === 200 && (r.headers.get('content-type') || '').includes('text/css'), String(r.status));
}
const manifest = await fetch(BASE + '/manifest.webmanifest');
ok('manifest do PWA válido', manifest.status === 200 && (await manifest.text()).includes('Cris Barber'));
const sw = await fetch(BASE + '/sw.js');
ok('service worker publicado', sw.status === 200);
const deep = await call('/adm/painel');
ok('deep link do painel cai no app (SPA)', deep.status === 200 && deep.text.includes('id="root"'));

/* 2 · API + D1 */
const health = await call('/api/health');
ok('API online com banco D1', health.status === 200 && health.data?.storage === 'd1', health.text);

let pub = await call('/api/public');
if (pub.data?.initialized === false) {
  const boot = await call('/api/bootstrap', { method: 'POST', body: JSON.stringify(buildSeed()) });
  ok('banco inicializado com os dados da barbearia', boot.status === 200, boot.text);
  pub = await call('/api/public');
}
ok('dados públicos carregados (serviços/barbeiros)', (pub.data?.services?.length || 0) >= 10 && (pub.data?.professionals?.length || 0) >= 3, JSON.stringify({ s: pub.data?.services?.length, p: pub.data?.professionals?.length }));
ok('senha do ADM NÃO é exposta', !pub.text.includes('adminPasswordHash'));
ok('telefone de cliente NÃO é exposto', !/"clientPhone":"\d/.test(pub.text));

/* 3 · autenticação do ADM */
const wrong = await call('/api/admin/login', { method: 'POST', body: JSON.stringify({ user: 'admin', password: 'errada' }) });
ok('senha errada é recusada', wrong.status === 401, String(wrong.status));
const login = await call('/api/admin/login', { method: 'POST', body: JSON.stringify({ user: 'admin', password: 'will123' }) });
ok('senha padrão will123 funciona', login.status === 200 && !!login.data?.token, login.text);
const token: string = login.data?.token;
const noAuth = await call('/api/admin/state');
ok('painel exige token', noAuth.status === 401, String(noAuth.status));
const state = await call('/api/admin/state', { token });
ok('ADM lê toda a base do SaaS', state.status === 200 && state.data?.state?.settings?.shopName === 'Cris Barber');

/* 4 · agendamento real no servidor publicado */
const db = state.data?.state || buildSeed();
const pro = db.professionals.find((p: any) => p.id === 'pro_cristian');
const service = db.services.find((s: any) => s.id === 'svc_corte');
let day = addDays(todayISO(), 1);
for (let i = 1; i < 25; i++) {
  const d = addDays(todayISO(), i);
  if (db.settings.hours[weekdayOf(d)].open && pro.workdays.includes(weekdayOf(d))) { day = d; break; }
}
const slots = getSlots({ ...db, appointments: pub.data.appointments }, { professionalId: pro.id, date: day, durationMin: service.durationMin });
const free = slots.find((s) => s.available);
ok('existe horário livre na agenda publicada', !!free, `${day} ${free?.time}`);

if (free) {
  const created = await call('/api/booking', {
    method: 'POST',
    body: JSON.stringify({ clientName: 'Verificação Deploy', clientPhone: '51990001122', serviceId: service.id, professionalId: pro.id, date: day, time: free.time }),
  });
  ok('cliente consegue agendar pelo site publicado', created.status === 201 && !!created.data?.appointment?.code, created.text);
  const dup = await call('/api/booking', {
    method: 'POST',
    body: JSON.stringify({ clientName: 'Outro Cliente', clientPhone: '51991112233', serviceId: service.id, professionalId: pro.id, date: day, time: free.time }),
  });
  ok('o mesmo horário não é vendido duas vezes', dup.status === 409, String(dup.status));
  const mine = await call('/api/my', { method: 'POST', body: JSON.stringify({ phone: '51990001122' }) });
  ok('cliente encontra o agendamento pelo WhatsApp', mine.status === 200 && mine.data.appointments.length === 1, mine.text.slice(0, 120));
  const cancel = await call('/api/booking/cancel', { method: 'POST', body: JSON.stringify({ id: mine.data.appointments[0].id, phone: '51990001122' }) });
  ok('cliente cancela o próprio horário', cancel.status === 200, cancel.text);
}

/* 5 · gravação do painel e limpeza da verificação */
const dirty = state.data.state;
const clean = { ...dirty, appointments: dirty.appointments.filter((a: any) => a.clientName !== 'Verificação Deploy' && a.clientName !== 'Outro Cliente') };
const put = await call('/api/admin/state', { method: 'PUT', token, body: JSON.stringify(clean) });
ok('ADM salva alterações no banco publicado', put.status === 200, put.text);
const finalPub = await call('/api/public');
ok('base final fica com os dados da barbearia', (finalPub.data?.services?.length || 0) >= 10 && (finalPub.data?.appointments?.length || 0) <= 7, JSON.stringify({ s: finalPub.data?.services?.length, a: finalPub.data?.appointments?.length }));

console.log(`\nSite publicado (${BASE}): ${pass} verificações OK · ${fails.length} falhas`);
if (fails.length) {
  fails.forEach((f) => console.log('  ✗', f));
  process.exitCode = 1;
}
