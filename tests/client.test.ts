/**
 * Testa o cliente da API (src/lib/api.ts) contra o Worker rodando de verdade.
 * O ponto principal: o motor de agendamento do app e o validador do servidor
 * precisam concordar sobre o que está livre ou ocupado.
 */
import { buildSeed } from '../src/data/seed';
import { getSlots } from '../src/lib/scheduling';
import { addDays, todayISO, weekdayOf } from '../src/lib/utils';
import {
  cancelBookingRemote, createBookingRemote, fetchAdminState, fetchMyBookings, fetchPublicState,
  loginRemote, mergeRemoteState, probeApi, saveAdminState,
} from '../src/lib/api';

const BASE = process.env.API_BASE || 'http://127.0.0.1:8787';
const nativeFetch = globalThis.fetch;
// o app usa caminhos relativos ("/api/..."); no Node redirecionamos para o Worker local
globalThis.fetch = ((input: any, init?: any) =>
  nativeFetch(typeof input === 'string' && input.startsWith('/') ? BASE + input : input, init)) as typeof fetch;

let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, extra = '') => {
  if (cond) pass++;
  else fails.push(`${name}${extra ? ' → ' + extra : ''}`);
};

const notified: string[] = [];
const ask = async (label: string, cond: boolean) => {
  ok(label, cond);
  notified.push(`${cond ? '✓' : '✗'} ${label}`);
};

/* 1 · conexão */
const up = await probeApi();
await ask('probeApi reconhece o backend', up === true);

const pub = await fetchPublicState();
await ask('cliente baixa o estado público', !!pub && pub.initialized === true);
await ask('estado público esconde telefone do cliente', !JSON.stringify(pub?.appointments || []).includes('5199'));
await ask('estado público esconde o hash da senha', !JSON.stringify(pub || {}).includes('adminPasswordHash'));

/* 1.1 · a agenda compartilhada ignora os agendamentos guardados no dispositivo */
const merged = mergeRemoteState(pub!, buildSeed());
await ask(
  'agenda compartilhada usa só os dados do servidor (sem dados de exemplo locais)',
  merged.appointments.length === pub!.appointments.length &&
    !merged.appointments.some((a) => a.clientPhone === '51991234567')
);

/* 2 · motor do cliente x validador do servidor */
const db = { ...buildSeed(), appointments: pub!.appointments, services: pub!.services, professionals: pub!.professionals, settings: { ...buildSeed().settings, ...pub!.settings } };
const pro = db.professionals.find((p) => p.id === 'pro_cristian')!;
const service = db.services.find((s) => s.id === 'svc_corte')!;

let day = addDays(todayISO(), 1);
for (let i = 1; i < 25; i++) {
  const d = addDays(todayISO(), i);
  if (db.settings.hours[weekdayOf(d)].open && pro.workdays.includes(weekdayOf(d))) {
    day = d;
    break;
  }
}

const slots = getSlots(db, { professionalId: pro.id, date: day, durationMin: service.durationMin });
const free = slots.find((s) => s.available);
const busy = slots.find((s) => s.reason === 'ocupado');
await ask('cliente encontra horário livre', !!free, `${day} ${free?.time}`);

if (free) {
  const first = await createBookingRemote({
    clientName: 'Cliente Teste UI',
    clientPhone: '(51) 99000-1122',
    serviceId: service.id,
    professionalId: pro.id,
    date: day,
    time: free.time,
    notes: 'teste automatizado',
  });
  await ask('servidor aceita o horário que o app mostrou como livre', first.ok === true, first.ok ? '' : first.error);

  const repeat = await createBookingRemote({
    clientName: 'Outro Cliente',
    clientPhone: '51988887777',
    serviceId: service.id,
    professionalId: pro.id,
    date: day,
    time: free.time,
  });
  await ask('servidor recusa o mesmo horário para outro cliente', repeat.ok === false, repeat.ok ? 'aceitou duplicado' : '');

  if (busy) {
    const onBusy = await createBookingRemote({
      clientName: 'Cliente Ocupado',
      clientPhone: '51977776666',
      serviceId: service.id,
      professionalId: pro.id,
      date: day,
      time: busy.time,
    });
    await ask('servidor recusa horário que o app mostra ocupado', onBusy.ok === false, `${busy.time} ${onBusy.ok ? 'aceitou' : ''}`);
  }

  const afterBooking = await fetchPublicState();
  await ask(
    'horário reservado some das opções do próximo cliente',
    !getSlots({ ...db, appointments: afterBooking!.appointments }, { professionalId: pro.id, date: day, durationMin: service.durationMin })
      .some((s) => s.time === free.time && s.available)
  );

  /* 3 · área do cliente */
  const mine = await fetchMyBookings('51990001122');
  await ask('cliente vê o próprio agendamento', mine.some((a) => a.time === free.time && a.status === 'pendente'), JSON.stringify(mine.map((m) => m.time)));
  const mineOther = await fetchMyBookings('51955554444');
  await ask('outro telefone não vê agendamento', mineOther.length === 0, String(mineOther.length));

  const cancelled = await cancelBookingRemote('51990001122', mine[0].id);
  await ask('cliente cancela o próprio horário', cancelled === true);
  const rebook = await createBookingRemote({
    clientName: 'Cliente Teste UI',
    clientPhone: '(51) 99000-1122',
    serviceId: service.id,
    professionalId: pro.id,
    date: day,
    time: free.time,
  });
  await ask('horário cancelado volta a ficar disponível', rebook.ok === true, rebook.ok ? '' : rebook.error);
}

/* 4 · painel ADM */
const bad = await loginRemote('admin', 'senha-errada');
await ask('login remoto recusa senha errada', bad.ok === false);
const good = await loginRemote('admin', 'will123');
await ask('login remoto aceita will123', good.ok === true, good.ok ? '' : good.error);

if (good.ok) {
  const full = await fetchAdminState(good.data);
  await ask('ADM carrega a base completa', !!full && full.appointments.length > 0);
  const badState = await fetchAdminState('token.falso');
  await ask('token inválido não lê a base', badState === null);
  const saved = await saveAdminState(good.data, { ...full!, version: 1 });
  await ask('ADM salva a base compartilhada', saved === true);
}

console.log(`\nCliente ↔ Worker: ${pass} verificações OK · ${fails.length} falhas`);
if (fails.length) {
  fails.forEach((f) => console.log('  ✗', f));
  process.exitCode = 1;
}
