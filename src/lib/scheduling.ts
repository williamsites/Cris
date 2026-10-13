import type { Appointment, DB, Professional, Service } from '../data/types';
import { addDays, todayISO, toHHMM, toMinutes, weekdayOf } from './utils';

export interface Slot {
  time: string;
  available: boolean;
  reason?: 'ocupado' | 'passado' | 'fechado' | 'intervalo' | 'limite';
  label?: string;
}

const INTERVAL_BLOCKING: Appointment['status'][] = ['pendente', 'confirmado', 'concluido'];

export const getService = (db: DB, id: string) => db.services.find((s) => s.id === id);
export const getProfessional = (db: DB, id: string) => db.professionals.find((p) => p.id === id);

export const proAttendsService = (pro: Professional, serviceId: string) =>
  pro.serviceIds.length === 0 || pro.serviceIds.includes(serviceId);

export const professionalsForService = (db: DB, serviceId: string) =>
  db.professionals.filter((p) => p.active && proAttendsService(p, serviceId));

/** Agendamentos que ocupam a agenda (não cancelados) de um profissional no dia */
export const busyFor = (db: DB, professionalId: string, date: string, ignoreId?: string) =>
  db.appointments
    .filter(
      (a) =>
        a.professionalId === professionalId &&
        a.date === date &&
        a.id !== ignoreId &&
        INTERVAL_BLOCKING.includes(a.status)
    )
    .map((a) => {
      const start = toMinutes(a.time);
      return { start, end: start + (a.durationMin || getService(db, a.serviceId)?.durationMin || 30) };
    })
    .sort((x, y) => x.start - y.start);

/** Limite máximo de atendimento que o profissional aceita no dia */
function proWindow(pro: Professional, date: string) {
  const wd = weekdayOf(date);
  if (!pro.workdays.includes(wd)) return null;
  return { start: toMinutes(pro.start), end: toMinutes(pro.end) };
}

function shopWindow(db: DB, date: string) {
  const hours = db.settings.hours[weekdayOf(date)];
  if (!hours || !hours.open) return null;
  return hours;
}

/**
 * MOTOR DE AGENDAMENTO INTELIGENTE
 * Calcula os horários reais disponíveis cruzando:
 *  - funcionamento da barbearia (por dia da semana + intervalo)
 *  - escala do profissional escolhido
 *  - duração do serviço
 *  - agendamentos já existentes (evita sobreposição) e antecedência mínima
 */
export function getSlots(
  db: DB,
  opts: { professionalId: string; date: string; durationMin: number; ignoreAppointmentId?: string }
): Slot[] {
  const { professionalId, date, durationMin, ignoreAppointmentId } = opts;
  const pro = getProfessional(db, professionalId);
  if (!pro) return [];

  const hours = shopWindow(db, date);
  const pw = proWindow(pro, date);
  if (!hours || !pw) return [];

  const step = Math.max(5, db.settings.slotMinutes || 15);
  const now = new Date();
  const isToday = date === todayISO();
  const nowMin = now.getHours() * 60 + now.getMinutes() + (db.settings.minLeadMinutes || 0);

  const start = Math.max(pw.start, toMinutes(hours.start));
  const end = Math.min(pw.end, toMinutes(hours.end));
  const busy = busyFor(db, professionalId, date, ignoreAppointmentId);

  const slots: Slot[] = [];
  for (let t = start; t + durationMin <= end; t += step) {
    const slotEnd = t + durationMin;

    // primeiro horário que atende (cadeiras cheias) — só entram candidatos alinhados,
    // e também o horário imediatamente após um atendimento existente
    const inBreak =
      hours.breakStart && hours.breakEnd
        ? t < toMinutes(hours.breakEnd) && slotEnd > toMinutes(hours.breakStart)
        : false;

    const overlap = busy.some((b) => t < b.end && b.start < slotEnd);

    let slot: Slot = { time: toHHMM(t), available: true };
    if (inBreak) slot = { time: toHHMM(t), available: false, reason: 'intervalo', label: 'Intervalo' };
    else if (overlap) {
      const b = busy.find((x) => t < x.end && x.start < slotEnd)!;
      slot = {
        time: toHHMM(t),
        available: false,
        reason: 'ocupado',
        label: `Ocupado até ${toHHMM(b.end)}`,
      };
    } else if (isToday && t < nowMin) {
      slot = { time: toHHMM(t), available: false, reason: 'passado', label: 'Horário passou' };
    }
    slots.push(slot);
  }

  // remove horários que não serviriam (buraco inútil): mantém apenas slots que
  // começam no início do bloco livre/fim de um atendimento ou são alinhados ao passo
  return dedupe(slots);
}

function dedupe(slots: Slot[]) {
  const seen = new Set<string>();
  return slots.filter((s) => (seen.has(s.time) ? false : (seen.add(s.time), true)));
}

/** Verificação final anti-duplicidade usada ao confirmar a reserva */
export function isSlotFree(
  db: DB,
  professionalId: string,
  date: string,
  time: string,
  durationMin: number,
  ignoreId?: string
) {
  const t = toMinutes(time);
  const slotEnd = t + durationMin;
  const hours = shopWindow(db, date);
  const pro = getProfessional(db, professionalId);
  if (!hours || !pro) return false;
  const pw = proWindow(pro, date);
  if (!pw) return false;
  const start = Math.max(pw.start, toMinutes(hours.start));
  const end = Math.min(pw.end, toMinutes(hours.end));
  if (t < start || slotEnd > end) return false;
  if (hours.breakStart && hours.breakEnd) {
    const bs = toMinutes(hours.breakStart);
    const be = toMinutes(hours.breakEnd);
    if (t < be && bs < slotEnd) return false;
  }
  return !busyFor(db, professionalId, date, ignoreId).some((b) => t < b.end && b.start < slotEnd);
}

/** Resumo de um dia (para a faixa de datas do agendamento) */
export function daySummary(
  db: DB,
  opts: { professionalId: string; date: string; durationMin: number }
) {
  const slots = getSlots(db, opts);
  const free = slots.filter((s) => s.available);
  return {
    open: slots.length > 0,
    total: slots.length,
    free: free.length,
    first: free[0]?.time,
    last: free[free.length - 1]?.time,
  };
}

/** Próximo horário livre a partir de hoje (usado no "próxima vaga") */
export function nextAvailable(
  db: DB,
  opts: { professionalId: string; durationMin: number; fromDate?: string }
) {
  let date = opts.fromDate || todayISO();
  for (let i = 0; i < 60; i++) {
    const s = daySummary(db, { ...opts, date });
    if (s.free > 0) return { date, time: s.first! };
    date = addDays(date, 1);
  }
  return null;
}

/** Intervalos ocupados de um dia (timeline do painel ADM) */
export function dayTimeline(db: DB, date: string, professionalId?: string) {
  return db.appointments
    .filter((a) => a.date === date && (!professionalId || a.professionalId === professionalId))
    .map((a) => {
      const start = toMinutes(a.time);
      const svc = getService(db, a.serviceId);
      return { appt: a, start, end: start + (a.durationMin || svc?.durationMin || 30), service: svc };
    })
    .sort((x, y) => x.start - y.start);
}

/** Conflito detectado ao mover/criar agendamento pelo painel */
export function findConflict(
  db: DB,
  appt: { professionalId: string; date: string; time: string; durationMin: number; id?: string }
) {
  return busyFor(db, appt.professionalId, appt.date, appt.id).find(
    (b) => toMinutes(appt.time) < b.end && b.start < toMinutes(appt.time) + appt.durationMin
  );
}

/** Rótulo de ocupação do dia (0-100%) */
export function occupancy(db: DB, date: string, professionalId?: string) {
  const pros = db.professionals.filter((p) => p.active && (!professionalId || p.id === professionalId));
  const hours = db.settings.hours[weekdayOf(date)];
  if (!hours?.open || pros.length === 0) return { pct: 0, booked: 0, capacity: 0 };
  const capacity = pros.reduce((acc, p) => {
    const start = Math.max(toMinutes(hours.start), toMinutes(p.start));
    const end = Math.min(toMinutes(hours.end), toMinutes(p.end));
    let mins = Math.max(0, end - start);
    if (hours.breakStart && hours.breakEnd) mins -= Math.max(0, toMinutes(hours.breakEnd) - toMinutes(hours.breakStart));
    return acc + Math.max(0, mins);
  }, 0);
  const booked = db.appointments
    .filter((a) => a.date === date && a.status !== 'cancelado' && (!professionalId || a.professionalId === professionalId))
    .reduce((acc, a) => acc + (a.durationMin || 30), 0);
  return { pct: capacity ? Math.min(100, Math.round((booked / capacity) * 100)) : 0, booked, capacity };
}

export type { Service };
