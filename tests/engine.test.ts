import { buildSeed } from '../src/data/seed';
import { getSlots, isSlotFree, occupancy, nextAvailable, professionalsForService, findConflict } from '../src/lib/scheduling';
import { addDays, toMinutes, todayISO, weekdayOf } from '../src/lib/utils';
import type { DB } from '../src/data/types';

let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, extra = '') => {
  if (cond) pass++;
  else fails.push(`${name}${extra ? ' → ' + extra : ''}`);
};

const base = buildSeed();
const today = todayISO();
const pro = base.professionals.find((p) => p.id === 'pro_cristian')!;

function nextDateWithWeekday(target: number, fromOffset = 1) {
  for (let i = fromOffset; i < 30; i++) {
    const d = addDays(today, i);
    if (weekdayOf(d) === target) return d;
  }
  throw new Error('sem data');
}
function addMinutes(hhmm: string, m: number) {
  const t = toMinutes(hhmm) + m;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

/* ---------- 1. dia fechado ---------- */
const closedIdx = base.settings.hours.findIndex((h) => !h.open);
if (closedIdx >= 0) {
  const iso = nextDateWithWeekday(closedIdx);
  ok('dia fechado da barbearia não gera horários', getSlots(base, { professionalId: pro.id, date: iso, durationMin: 30 }).length === 0, iso);
}

/* ---------- 2. dia aberto: grade correta ---------- */
const openIdx = base.settings.hours.findIndex((h, i) => h.open && pro.workdays.includes(i));
const day = nextDateWithWeekday(openIdx);
const hours = base.settings.hours[openIdx];
const slots = getSlots(base, { professionalId: pro.id, date: day, durationMin: 30 });
ok('dia aberto gera grade', slots.length > 0, day);
ok('primeiro horário respeita a escala do barbeiro', toMinutes(slots[0].time) === Math.max(toMinutes(pro.start), toMinutes(hours.start)), slots[0]?.time);
ok('grade alinhada ao passo configurado', slots.every((s) => toMinutes(s.time) % base.settings.slotMinutes === 0));
ok('último horário cabe antes do fim do expediente', toMinutes(slots[slots.length - 1].time) + 30 <= Math.min(toMinutes(pro.end), toMinutes(hours.end)));
ok('nenhum horário marcado como ocupado em dia sem cliente', slots.every((s) => s.reason !== 'ocupado'));
ok('fora da pausa, todos os horários ficam livres', slots.filter((s) => s.reason !== 'intervalo').every((s) => s.available));

/* ---------- 3. pausa de almoço ---------- */
if (hours.breakStart && hours.breakEnd) {
  const lunch = slots.filter((s) => s.reason === 'intervalo');
  ok('pausa de almoço aparece bloqueada', lunch.length > 0);
  ok('horário dentro da pausa não é agendável', isSlotFree(base, pro.id, day, lunch[0].time, 30) === false, lunch[0]?.time);
}

/* ---------- 4. duração do serviço muda a grade ---------- */
const short = getSlots(base, { professionalId: pro.id, date: day, durationMin: 15 });
const long = getSlots(base, { professionalId: pro.id, date: day, durationMin: 120 });
ok('serviço mais longo tem menos horários', long.length < short.length, `${long.length} < ${short.length}`);
ok('serviço de 120min não começa no fim do dia', long.every((s) => toMinutes(s.time) + 120 <= Math.min(toMinutes(pro.end), toMinutes(hours.end))));

/* ---------- 5. cliente já marcado bloqueia o horário (dia isolado) ---------- */
const db2: DB = {
  ...base,
  appointments: [
    { id: 'x1', code: 'AAA111', clientName: 'Cliente Um', clientPhone: '51999999999', serviceId: 'svc_combo', professionalId: pro.id, date: day, time: '09:00', durationMin: 70, price: 80, status: 'confirmado', createdAt: '' },
    { id: 'x2', code: 'BBB222', clientName: 'Cliente Dois', clientPhone: '51988888888', serviceId: 'svc_corte', professionalId: 'pro_luan', date: day, time: '09:00', durationMin: 40, price: 45, status: 'confirmado', createdAt: '' },
  ],
};
const s2 = getSlots(db2, { professionalId: pro.id, date: day, durationMin: 30 });
const at = (t: string) => s2.find((s) => s.time === t);
ok('horário de início do cliente marcado bloqueado', at('09:00')?.available === false);
ok('meio do atendimento bloqueado', at('09:45')?.available === false, '09:45');
ok('sobreposição parcial do fim bloqueada', at('10:00')?.available === false, '10:00 (10:30 > 10:10)');
ok('primeiro horário após o atendimento fica livre', at('10:15')?.available === true, '10:15');
ok('isSlotFree aceita o horário livre', isSlotFree(db2, pro.id, day, '10:15', 30) === true);
ok('isSlotFree recusa horário ocupado', isSlotFree(db2, pro.id, day, '09:30', 30) === false);
ok('agenda de outro barbeiro não interfere', s2.find((s) => s.time === '09:00')?.reason === 'ocupado');
const luan = getSlots(db2, { professionalId: 'pro_luan', date: day, durationMin: 30 });
ok('barbeiro diferente mantém o próprio dia livre', luan.find((s) => s.time === '09:00')?.available === false && luan.find((s) => s.time === '10:00')?.available === true);
ok('findConflict detecta choque', !!findConflict(db2, { professionalId: pro.id, date: day, time: '09:30', durationMin: 30 }));
ok('findConflict não acusa horário livre', !findConflict(db2, { professionalId: pro.id, date: day, time: '10:15', durationMin: 30 }));
ok('findConflict ignora o próprio agendamento ao editar', !findConflict(db2, { professionalId: pro.id, date: day, time: '09:00', durationMin: 70, id: 'x1' }));

/* ---------- 6. escala do barbeiro ---------- */
const notWork = base.settings.hours.findIndex((h, i) => h.open && !pro.workdays.includes(i));
if (notWork >= 0) {
  ok('barbeiro fora da escala não gera horários', getSlots(base, { professionalId: pro.id, date: nextDateWithWeekday(notWork), durationMin: 30 }).length === 0);
}

/* ---------- 7. serviços por profissional ---------- */
ok('profissional restrito não aparece em serviço que não faz', !professionalsForService(base, 'svc_platinado').some((p) => p.id === 'pro_gabriel'));
ok('profissional sem restrição atende qualquer serviço', professionalsForService(base, 'svc_platinado').some((p) => p.id === 'pro_cristian'));

/* ---------- 8. hoje: antecedência e passado ---------- */
const todaySlots = getSlots(base, { professionalId: pro.id, date: today, durationMin: 30 });
const nowM = new Date().getHours() * 60 + new Date().getMinutes() + base.settings.minLeadMinutes;
ok('nada livre antes da antecedência mínima', todaySlots.filter((s) => s.available).every((s) => toMinutes(s.time) >= nowM));
const seededToday = base.appointments.find((a) => a.professionalId === pro.id && a.date === today && a.status !== 'cancelado');
if (seededToday) {
  ok('cliente já marcado hoje fica bloqueado', todaySlots.find((s) => s.time === seededToday.time)?.available === false, seededToday.time);
  ok('isSlotFree recusa o horário do cliente', isSlotFree(base, pro.id, today, seededToday.time, 30) === false);
}

/* ---------- 9. ocupação e próxima vaga ---------- */
const occ = occupancy(base, today);
ok('ocupação entre 0 e 100', occ.pct >= 0 && occ.pct <= 100, JSON.stringify(occ));
const next = nextAvailable(base, { professionalId: pro.id, durationMin: 30 });
ok('existe próxima vaga na agenda', !!next, JSON.stringify(next));
if (next) {
  ok('próxima vaga é realmente livre', isSlotFree(base, pro.id, next.date, next.time, 30));
  ok('próxima vaga é hoje ou amanhã', next.date === today || next.date === addDays(today, 1), next.date);
}

/* ---------- 10. consistência das durações ---------- */
ok('todos os serviços têm duração > 0', base.services.every((s) => s.durationMin > 0));
ok('grade sem horários duplicados', new Set(slots.map((s) => s.time)).size === slots.length);
ok('horários em ordem crescente', slots.every((s, i) => i === 0 || toMinutes(slots[i - 1].time) < toMinutes(s.time)));
ok('nenhum horário livre começa antes da abertura', slots.filter((s) => s.available).every((s) => toMinutes(s.time) >= toMinutes(hours.start)));
ok('adicionar 70min ao 09:00 dá 10:10', addMinutes('09:00', 70) === '10:10');

console.log(`\nMotor de agendamento: ${pass} verificações OK · ${fails.length} falhas`);
if (fails.length) {
  fails.forEach((f) => console.log('  ✗', f));
  process.exit(1);
}
