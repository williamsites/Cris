/** Testa a API do SaaS rodando dentro do workerd (wrangler dev) com D1 local. */
import { buildSeed } from '../src/data/seed';
import { addDays, todayISO, weekdayOf } from '../src/lib/utils';

const BASE = process.env.API_BASE || 'http://127.0.0.1:8787';
let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, extra = '') => {
  if (cond) pass++;
  else fails.push(`${name}${extra ? ' → ' + extra : ''}`);
};

async function call(path: string, init?: RequestInit & { token?: string }) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (init?.token) headers.authorization = `Bearer ${init.token}`;
  const res = await fetch(BASE + path, {
    method: init?.method || 'GET',
    headers,
    body: init?.body,
  });
  const text = await res.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { /* não-json */ }
  return { status: res.status, data, text };
}

const seed = buildSeed();
const pro = seed.professionals.find((p) => p.id === 'pro_cristian')!;

/* dia futuro, aberto na barbearia e na escala do barbeiro */
let day = addDays(todayISO(), 1);
for (let i = 1; i < 25; i++) {
  const d = addDays(todayISO(), i);
  const h = seed.settings.hours[weekdayOf(d)];
  if (h.open && pro.workdays.includes(weekdayOf(d))) { day = d; break; }
}
const hours = seed.settings.hours[weekdayOf(day)];

/* 1 · health */
const health = await call('/api/health');
ok('GET /api/health responde ok', health.status === 200 && health.data?.ok === true, health.text);
ok('health informa o D1 conectado', health.data?.storage === 'd1', String(health.data?.storage));

/* 2 · público antes do bootstrap */
const before = await call('/api/public');
ok('API vazia responde initialized:false', before.status === 200 && before.data?.initialized === false, before.text);

/* 3 · bootstrap */
const boot = await call('/api/bootstrap', { method: 'POST', body: JSON.stringify(seed) });
ok('bootstrap inicializa a base', boot.status === 200 && boot.data?.ok === true, boot.text);
const bootAgain = await call('/api/bootstrap', { method: 'POST', body: JSON.stringify(seed) });
ok('bootstrap não roda duas vezes', bootAgain.status === 409, String(bootAgain.status));

/* 4 · visão pública não vaza dados privados */
const pub = await call('/api/public');
ok('público traz serviços e profissionais', (pub.data?.services?.length || 0) > 0 && (pub.data?.professionals?.length || 0) > 0);
ok('público NÃO expõe hash da senha do ADM', !JSON.stringify(pub.text).includes('adminPasswordHash'));
ok('público NÃO expõe telefone de cliente', !pub.text.includes(seed.appointments[0].clientPhone) && !pub.text.includes('Rafael Machado'));
ok('bootstrap publica os agendamentos de exemplo como horários ocupados',
  (pub.data?.appointments?.length || 0) === seed.appointments.filter((a) => a.status !== 'cancelado').length,
  String(pub.data?.appointments?.length));

/* 5 · login ADM */
const badLogin = await call('/api/admin/login', { method: 'POST', body: JSON.stringify({ user: 'admin', password: 'errada' }) });
ok('login com senha errada é recusado', badLogin.status === 401, String(badLogin.status));
const login = await call('/api/admin/login', { method: 'POST', body: JSON.stringify({ user: 'admin', password: 'will123' }) });
ok('login com will123 funciona', login.status === 200 && !!login.data?.token, login.text);
const token: string = login.data?.token;

/* 6 · proteção do painel */
const noToken = await call('/api/admin/state');
ok('GET /api/admin/state exige token', noToken.status === 401, String(noToken.status));
const wrongToken = await call('/api/admin/state', { token: 'abc.def' });
ok('token inválido é recusado', wrongToken.status === 401, String(wrongToken.status));
const adminState = await call('/api/admin/state', { token });
ok('ADM lê a base completa', adminState.status === 200 && adminState.data?.state?.settings?.shopName === 'Cris Barber', adminState.text.slice(0, 120));

/* 7 · agendamento validado no servidor */
const booking = await call('/api/booking', {
  method: 'POST',
  body: JSON.stringify({ clientName: 'Teste Automático', clientPhone: '(51) 99123-4567', serviceId: 'svc_combo', professionalId: pro.id, date: day, time: hours.start, notes: 'teste' }),
});
ok('cliente agenda horário livre', booking.status === 201 && !!booking.data?.appointment?.code, booking.text);
const appt = booking.data?.appointment;
const pubAfter = await call('/api/public');
const busyBlock = (pubAfter.data?.appointments || []).find((a: any) => a.date === day && a.time === hours.start);
ok('horário agendado aparece bloqueado na visão pública', !!busyBlock && busyBlock.durationMin === 70, JSON.stringify(busyBlock));
ok('bloco público esconde nome e telefone do cliente', busyBlock?.clientName === 'Cliente' && busyBlock?.clientPhone === '' && !busyBlock?.code, JSON.stringify(busyBlock));

const again = await call('/api/booking', {
  method: 'POST',
  body: JSON.stringify({ clientName: 'Outro Cliente', clientPhone: '51991112222', serviceId: 'svc_combo', professionalId: pro.id, date: day, time: hours.start }),
});
ok('mesmo horário é recusado (anti-duplicidade)', again.status === 409 && again.data?.error === 'slot_taken', again.text);

/* sobreposição parcial: combo dura 70min, tentar 30min depois do início */
const overlapTime = `${String(Math.floor((Number(hours.start.slice(0, 2)) * 60 + 30) / 60)).padStart(2, '0')}:${String((Number(hours.start.slice(0, 2)) * 60 + 30) % 60).padStart(2, '0')}`;
const overlap = await call('/api/booking', {
  method: 'POST',
  body: JSON.stringify({ clientName: 'Cliente Sobreposto', clientPhone: '51993334444', serviceId: 'svc_pezinho', professionalId: pro.id, date: day, time: overlapTime }),
});
ok('sobreposição parcial é recusada', overlap.status === 409, `${overlapTime} → ${overlap.text}`);

/* horário na pausa */
const breakRes = await call('/api/booking', {
  method: 'POST',
  body: JSON.stringify({ clientName: 'Cliente Pausa', clientPhone: '51994445555', serviceId: 'svc_pezinho', professionalId: pro.id, date: day, time: hours.breakStart }),
});
ok('horário na pausa é recusado', breakRes.status === 409 && breakRes.data?.error === 'break_time', breakRes.text);

/* data passada */
const pastRes = await call('/api/booking', {
  method: 'POST',
  body: JSON.stringify({ clientName: 'Cliente Passado', clientPhone: '51995556666', serviceId: 'svc_corte', professionalId: pro.id, date: addDays(todayISO(), -3), time: '10:00' }),
});
ok('data passada é recusada', pastRes.status === 409, pastRes.text);

/* dia fechado */
const closedIdx = seed.settings.hours.findIndex((h) => !h.open);
let closedDay = addDays(todayISO(), 1);
for (let i = 1; i < 15; i++) { const d = addDays(todayISO(), i); if (weekdayOf(d) === closedIdx) { closedDay = d; break; } }
const closedRes = await call('/api/booking', {
  method: 'POST',
  body: JSON.stringify({ clientName: 'Cliente Fechado', clientPhone: '51996667777', serviceId: 'svc_corte', professionalId: pro.id, date: closedDay, time: '10:00' }),
});
ok('dia fechado é recusado', closedRes.status === 409 && closedRes.data?.error === 'closed_day', closedRes.text);

/* profissional que não faz o serviço */
const wrongPro = await call('/api/booking', {
  method: 'POST',
  body: JSON.stringify({ clientName: 'Cliente Errado', clientPhone: '51997778888', serviceId: 'svc_platinado', professionalId: 'pro_gabriel', date: day, time: '13:00' }),
});
ok('profissional sem o serviço é recusado', wrongPro.status === 409 && wrongPro.data?.error === 'professional_cannot_do_service', wrongPro.text);

/* validação de dados do cliente */
const noPhone = await call('/api/booking', {
  method: 'POST',
  body: JSON.stringify({ clientName: 'Sem Telefone', clientPhone: '123', serviceId: 'svc_corte', professionalId: pro.id, date: day, time: '15:00' }),
});
ok('telefone inválido é recusado', noPhone.status === 400, noPhone.text);

/* 8 · agendamentos do cliente */
const mine = await call('/api/my', { method: 'POST', body: JSON.stringify({ phone: '51991234567' }) });
ok('cliente consulta os próprios agendamentos', mine.status === 200 && mine.data.appointments.some((a: any) => a.code === appt.code), mine.text.slice(0, 160));
const other = await call('/api/my', { method: 'POST', body: JSON.stringify({ phone: '51900000000' }) });
ok('outro telefone não vê o agendamento', other.status === 200 && other.data.appointments.length === 0, other.text);

/* 9 · cancelamento e liberação do horário */
const cancel = await call('/api/booking/cancel', { method: 'POST', body: JSON.stringify({ code: appt.code, phone: '51991234567' }) });
ok('cliente cancela o próprio horário', cancel.status === 200, cancel.text);
const cancelWrong = await call('/api/booking/cancel', { method: 'POST', body: JSON.stringify({ code: appt.code, phone: '51900000000' }) });
ok('cancelamento exige o telefone dono do agendamento', cancelWrong.status === 404, String(cancelWrong.status));
const rebook = await call('/api/booking', {
  method: 'POST',
  body: JSON.stringify({ clientName: 'Cliente Novo', clientPhone: '51888887777', serviceId: 'svc_combo', professionalId: pro.id, date: day, time: hours.start }),
});
ok('horário cancelado volta a ficar livre', rebook.status === 201, rebook.text);

/* 10 · ADM grava a base (editar serviços/produtos/preços) */
const edited = JSON.parse(JSON.stringify(seed));
edited.services = edited.services.map((s) => (s.id === 'svc_corte' ? { ...s, price: 55 } : s));
edited.settings.shopName = 'Cris Barber';
const put = await call('/api/admin/state', { method: 'PUT', token, body: JSON.stringify(edited) });
ok('ADM salva a base completa', put.status === 200 && put.data?.ok === true, put.text);
const afterPut = await call('/api/public');
ok('alteração do ADM aparece para os clientes', afterPut.data.services.find((s: any) => s.id === 'svc_corte')?.price === 55, JSON.stringify(afterPut.data.services.find((s: any) => s.id === 'svc_corte')));
const putNoToken = await call('/api/admin/state', { method: 'PUT', body: JSON.stringify(edited) });
ok('gravação sem token é bloqueada', putNoToken.status === 401, String(putNoToken.status));

/* 11 · troca de senha do ADM */
const wrongPwd = await call('/api/admin/password', { method: 'POST', token, body: JSON.stringify({ current: 'errada', next: 'nova12345' }) });
ok('troca de senha exige a senha atual', wrongPwd.status === 403, String(wrongPwd.status));
const weak = await call('/api/admin/password', { method: 'POST', token, body: JSON.stringify({ current: 'will123', next: '123' }) });
ok('senha muito curta é recusada', weak.status === 400, String(weak.status));
const changed = await call('/api/admin/password', { method: 'POST', token, body: JSON.stringify({ current: 'will123', next: 'nova12345' }) });
ok('troca de senha funciona', changed.status === 200, changed.text);
const oldLogin = await call('/api/admin/login', { method: 'POST', body: JSON.stringify({ user: 'admin', password: 'will123' }) });
ok('senha antiga deixa de funcionar', oldLogin.status === 401, String(oldLogin.status));
const newLogin = await call('/api/admin/login', { method: 'POST', body: JSON.stringify({ user: 'admin', password: 'nova12345' }) });
ok('senha nova funciona', newLogin.status === 200 && !!newLogin.data?.token, newLogin.text);
/* volta a senha para will123 para o pacote entregue continuar com o padrão */
const restore = await call('/api/admin/password', { method: 'POST', token: newLogin.data.token, body: JSON.stringify({ current: 'nova12345', next: 'will123' }) });
ok('senha restaurada para will123', restore.status === 200, restore.text);
const finalLogin = await call('/api/admin/login', { method: 'POST', body: JSON.stringify({ user: 'admin', password: 'will123' }) });
ok('login will123 volta a funcionar', finalLogin.status === 200, finalLogin.text);

/* 12 · rota inexistente e SPA */
const notFound = await call('/api/nao-existe');
ok('rota de API inexistente devolve 404', notFound.status === 404, String(notFound.status));
const spa = await fetch(BASE + '/alguma-rota-do-app');
const spaText = await spa.text();
ok('SPA fallback serve o index.html', spa.status === 200 && spaText.includes('id="root"'), String(spa.status));
const asset = await fetch(BASE + '/manifest.webmanifest');
ok('manifest do PWA é servido', asset.status === 200 && (asset.headers.get('content-type') || '').includes('manifest'), asset.status + ' ' + asset.headers.get('content-type'));

console.log(`\nAPI (workerd + D1 local): ${pass} verificações OK · ${fails.length} falhas`);
if (fails.length) {
  fails.forEach((f) => console.log('  ✗', f));
  process.exitCode = 1;
}
