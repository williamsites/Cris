/**
 * API do Cris Barber SaaS (Cloudflare Worker / Pages Functions + D1)
 *
 * - GET    /api/health              → status da API
 * - GET    /api/public              → dados públicos (sem telefones/senhas) + horários ocupados
 * - POST   /api/bootstrap           → primeira inicialização (só quando o banco está vazio)
 * - POST   /api/booking             → cria agendamento validando o horário no servidor
 * - POST   /api/booking/cancel      → cliente cancela o próprio agendamento
 * - POST   /api/my                  → agendamentos de um telefone
 * - POST   /api/admin/login         → valida senha do ADM e devolve token
 * - GET    /api/admin/state         → base completa (token)
 * - PUT    /api/admin/state         → substitui a base completa (token)
 * - POST   /api/admin/password      → troca a senha do ADM (token)
 */

const DEFAULT_ADMIN_HASH = '124ad419d66ecc22c65e736deec26a028a3dfd912b5896fa3b7e508724b4e326'; // will123
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30;

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...extra,
    },
  });

const sha256 = async (text) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

const b64url = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlDecode = (s) => {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/');
  return atob(pad + '='.repeat((4 - (pad.length % 4)) % 4));
};

const toMin = (hhmm) => {
  const [h, m] = String(hhmm || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const pad2 = (n) => String(n).padStart(2, '0');
const toHHMM = (mins) => `${pad2(Math.floor(mins / 60))}:${pad2(mins % 60)}`;
/** data e hora no fuso da barbearia (o Worker roda em UTC) */
function localNow(tz = 'America/Sao_Paulo') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value || '00';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}
const weekdayOf = (iso) => new Date(`${iso}T12:00:00Z`).getUTCDay();
const code6 = () => {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
};

/* ------------------------------- storage ------------------------------- */
async function ensureTable(env) {
  if (!env || !env.DB) throw new Error('binding DB (D1) ausente');
  await env.DB.prepare(
    'CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL)'
  ).run();
}

async function readState(env) {
  await ensureTable(env);
  const row = await env.DB.prepare('SELECT data FROM app_state WHERE id = 1').first();
  if (!row || !row.data) return null;
  try {
    return JSON.parse(row.data);
  } catch {
    return null;
  }
}

async function writeState(env, db) {
  await ensureTable(env);
  await env.DB.prepare(
    'INSERT INTO app_state (id, data, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at'
  )
    .bind(JSON.stringify(db), new Date().toISOString())
    .run();
}

const normalizeState = (raw) => {
  const base = raw && typeof raw === 'object' ? raw : {};
  return {
    version: 1,
    settings: { ...(base.settings || {}), adminPasswordHash: base.settings?.adminPasswordHash || DEFAULT_ADMIN_HASH },
    services: Array.isArray(base.services) ? base.services : [],
    products: Array.isArray(base.products) ? base.products : [],
    professionals: Array.isArray(base.professionals) ? base.professionals : [],
    banners: Array.isArray(base.banners) ? base.banners : [],
    appointments: Array.isArray(base.appointments) ? base.appointments : [],
  };
};

/** oculta tudo que é privado antes de enviar ao cliente */
export function publicView(db) {
  const { adminPasswordHash, ...safeSettings } = db.settings || {};
  return {
    initialized: true,
    settings: safeSettings,
    services: db.services || [],
    products: db.products || [],
    professionals: db.professionals || [],
    banners: db.banners || [],
    appointments: (db.appointments || [])
      .filter((a) => a.status !== 'cancelado')
      .map((a) => ({
        id: a.id,
        code: '',
        clientName: 'Cliente',
        clientPhone: '',
        serviceId: a.serviceId,
        professionalId: a.professionalId,
        date: a.date,
        time: a.time,
        durationMin: a.durationMin,
        price: 0,
        status: a.status,
        createdAt: '',
      })),
  };
}

/* -------------------------------- tokens ------------------------------- */
const secretOf = (env) => (env && env.AUTH_SECRET) || 'cris-barber-dev-secret-troque-em-producao';

async function hmac(text, secret) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return b64url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text)));
}

async function makeToken(env, user) {
  const payload = b64url(new TextEncoder().encode(JSON.stringify({ user, exp: Date.now() + TOKEN_TTL_MS })));
  return `${payload}.${await hmac(payload, secretOf(env))}`;
}

async function checkToken(env, request) {
  const header = request.headers.get('authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token || !token.includes('.')) return false;
  const [payload, sig] = token.split('.');
  const expected = await hmac(payload, secretOf(env));
  if (sig !== expected) return false;
  try {
    const data = JSON.parse(b64urlDecode(payload));
    return data.exp > Date.now() ? data : false;
  } catch {
    return false;
  }
}

/* ----------------------------- agendamento ----------------------------- */
function validateBooking(db, body) {
  const settings = db.settings || {};
  const hours = Array.isArray(settings.hours) ? settings.hours : null;
  const service = (db.services || []).find((s) => s.id === body.serviceId && s.active !== false);
  const pro = (db.professionals || []).find((p) => p.id === body.professionalId && p.active !== false);
  if (!service) return { error: 'service_not_found' };
  if (!pro) return { error: 'professional_not_found' };
  if (pro.serviceIds?.length && !pro.serviceIds.includes(service.id)) return { error: 'professional_cannot_do_service' };

  const date = String(body.date || '');
  const time = String(body.time || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return { error: 'invalid_datetime' };

  const wd = weekdayOf(date);
  const day = hours ? hours[wd] : null;
  if (hours && (!day || !day.open)) return { error: 'closed_day' };
  if (!pro.workdays?.includes(wd)) return { error: 'professional_day_off' };

  const duration = Number(service.durationMin) || 30;
  const start = Math.max(toMin(pro.start), hours ? toMin(day.start) : 0);
  const end = Math.min(toMin(pro.end), hours ? toMin(day.end) : 24 * 60);
  const t = toMin(time);
  if (t < start || t + duration > end) return { error: 'outside_hours' };
  if (day?.breakStart && day?.breakEnd) {
    const bs = toMin(day.breakStart);
    const be = toMin(day.breakEnd);
    if (t < be && bs < t + duration) return { error: 'break_time' };
  }

  const now = localNow(body.timeZone || settings.timeZone || 'America/Sao_Paulo');
  if (date < now.date) return { error: 'past_date' };
  if (date === now.date) {
    const lead = now.minutes + (Number(settings.minLeadMinutes) || 0);
    if (t < lead) return { error: 'too_late' };
  }

  const clash = (db.appointments || []).find(
    (a) =>
      a.professionalId === pro.id &&
      a.date === date &&
      a.status !== 'cancelado' &&
      t < toMin(a.time) + (Number(a.durationMin) || 30) &&
      toMin(a.time) < t + duration
  );
  if (clash) return { error: 'slot_taken' };

  return { service, pro, duration, date, time };
}

const ERROR_MESSAGES = {
  service_not_found: 'Serviço não encontrado.',
  professional_not_found: 'Profissional não encontrado.',
  professional_cannot_do_service: 'Esse profissional não atende esse serviço.',
  invalid_datetime: 'Data ou horário inválidos.',
  closed_day: 'A barbearia está fechada nesse dia.',
  professional_day_off: 'O profissional não atende nesse dia.',
  outside_hours: 'Horário fora do expediente.',
  break_time: 'Horário dentro da pausa da barbearia.',
  past_date: 'Não é possível agendar em datas passadas.',
  too_late: 'Horário muito próximo do agora. Escolha um horário mais tarde.',
  slot_taken: 'Esse horário acabou de ser reservado. Escolha outro.',
};

/* ------------------------------- handlers ------------------------------ */
export async function handleApi(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/')) return null;
  const route = url.pathname.replace(/\/+$/, '');
  const method = request.method.toUpperCase();

  try {
    if (route === '/api/health' && method === 'GET') {
      return json({ ok: true, service: 'cris-barber', storage: env?.DB ? 'd1' : 'none' });
    }

    /* ---- dados públicos ---- */
    if (route === '/api/public' && method === 'GET') {
      const db = await readState(env);
      if (!db) return json({ initialized: false, appointments: [], services: [], products: [], professionals: [], banners: [], settings: null });
      return json({ ...publicView(db), updatedAt: undefined });
    }

    /* ---- bootstrap (uma única vez, com o banco vazio) ---- */
    if (route === '/api/bootstrap' && method === 'POST') {
      const current = await readState(env);
      if (current) return json({ error: 'already_initialized' }, 409);
      const body = await request.json().catch(() => null);
      if (!body || !body.settings || !Array.isArray(body.services)) return json({ error: 'invalid_payload' }, 400);
      const state = normalizeState(body);
      state.settings.adminPasswordHash = DEFAULT_ADMIN_HASH; // senha do ADM nunca vem do cliente
      await writeState(env, state);
      return json({ ok: true });
    }

    /* ---- agendamento pelo cliente (validado no servidor) ---- */
    if (route === '/api/booking' && method === 'POST') {
      const db = await readState(env);
      if (!db) return json({ error: 'not_initialized' }, 409);
      const body = await request.json().catch(() => null);
      if (!body) return json({ error: 'invalid_payload' }, 400);
      const name = String(body.clientName || '').trim();
      const phone = String(body.clientPhone || '').replace(/\D+/g, '');
      if (name.length < 3) return json({ error: 'invalid_name', message: 'Informe seu nome completo.' }, 400);
      if (phone.length < 10) return json({ error: 'invalid_phone', message: 'Informe um WhatsApp válido com DDD.' }, 400);

      const check = validateBooking(db, body);
      if (check.error) return json({ error: check.error, message: ERROR_MESSAGES[check.error] || 'Horário indisponível.' }, 409);

      const appt = {
        id: `apt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
        code: code6(),
        clientName: name,
        clientPhone: phone,
        serviceId: check.service.id,
        professionalId: check.pro.id,
        date: check.date,
        time: check.time,
        durationMin: check.duration,
        price: Number(check.service.price) || 0,
        notes: String(body.notes || '').slice(0, 400),
        status: 'pendente',
        createdAt: new Date().toISOString(),
      };
      db.appointments.push(appt);
      await writeState(env, db);
      return json({ ok: true, appointment: appt }, 201);
    }

    /* ---- agendamentos do cliente ---- */
    if (route === '/api/my' && method === 'POST') {
      const db = await readState(env);
      if (!db) return json({ appointments: [] });
      const body = await request.json().catch(() => ({}));
      const phone = String(body?.phone || '').replace(/\D+/g, '');
      if (phone.length < 10) return json({ error: 'invalid_phone' }, 400);
      return json({
        appointments: (db.appointments || [])
          .filter((a) => a.clientPhone === phone)
          .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)),
      });
    }

    /* ---- cancelamento pelo cliente ---- */
    if (route === '/api/booking/cancel' && method === 'POST') {
      const db = await readState(env);
      if (!db) return json({ error: 'not_initialized' }, 409);
      const body = await request.json().catch(() => ({}));
      const phone = String(body?.phone || '').replace(/\D+/g, '');
      const appt = (db.appointments || []).find(
        (a) => (a.id === body?.id || a.code === body?.code) && a.clientPhone === phone
      );
      if (!appt) return json({ error: 'not_found' }, 404);
      appt.status = 'cancelado';
      await writeState(env, db);
      return json({ ok: true });
    }

    /* ---- login ADM ---- */
    if (route === '/api/admin/login' && method === 'POST') {
      const db = (await readState(env)) || normalizeState({});
      const body = await request.json().catch(() => ({}));
      const user = String(body?.user || '').trim().toLowerCase();
      const expectedUser = String(db.settings.adminUser || 'admin').toLowerCase();
      const hash = await sha256(String(body?.password || ''));
      if (user !== expectedUser || hash !== db.settings.adminPasswordHash) {
        return json({ error: 'invalid_credentials', message: 'Usuário ou senha inválidos.' }, 401);
      }
      return json({ ok: true, token: await makeToken(env, user), mode: 'remote' });
    }

    /* ---- troca de senha ---- */
    if (route === '/api/admin/password' && method === 'POST') {
      const auth = await checkToken(env, request);
      if (!auth) return json({ error: 'unauthorized' }, 401);
      const db = (await readState(env)) || normalizeState({});
      const body = await request.json().catch(() => ({}));
      const current = await sha256(String(body?.current || ''));
      if (current !== db.settings.adminPasswordHash) return json({ error: 'wrong_password' }, 403);
      const next = String(body?.next || '');
      if (next.length < 6) return json({ error: 'weak_password' }, 400);
      db.settings.adminPasswordHash = await sha256(next);
      await writeState(env, db);
      return json({ ok: true, token: await makeToken(env, auth.user) });
    }

    /* ---- base completa (ADM) ---- */
    if (route === '/api/admin/state') {
      const auth = await checkToken(env, request);
      if (!auth) return json({ error: 'unauthorized' }, 401);
      if (method === 'GET') {
        const db = await readState(env);
        return json({ state: db, initialized: !!db });
      }
      if (method === 'PUT') {
        const body = await request.json().catch(() => null);
        if (!body || !body.settings || !Array.isArray(body.services)) return json({ error: 'invalid_payload' }, 400);
        const state = normalizeState(body);
        const current = await readState(env);
        // mantém o hash da senha atual se o cliente não mandar nenhum
        state.settings.adminPasswordHash =
          body.settings.adminPasswordHash || current?.settings?.adminPasswordHash || DEFAULT_ADMIN_HASH;
        await writeState(env, state);
        return json({ ok: true, savedAt: new Date().toISOString() });
      }
    }

    return json({ error: 'not_found', path: route }, 404);
  } catch (e) {
    return json({ error: 'server_error', message: String(e && e.message ? e.message : e) }, 500);
  }
}

export { DEFAULT_ADMIN_HASH };
