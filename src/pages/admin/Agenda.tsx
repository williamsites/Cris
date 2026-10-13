import { useState, useMemo } from 'react';
import { useDB } from '../../data/store';
import { Icon } from '../../components/Icon';
import { Badge, ConfirmButton, Empty, Modal, StatCard } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { dayTimeline, findConflict, getSlots, occupancy } from '../../lib/scheduling';
import type { Appointment, AppointmentStatus } from '../../data/types';
import { addDays, brl, formatDateLong, formatDuration, maskPhone, onlyDigits, todayISO, toMinutes } from '../../lib/utils';

const STATUS: AppointmentStatus[] = ['pendente', 'confirmado', 'concluido', 'cancelado'];

export default function Agenda() {
  const { db, updateAppointment, removeAppointment, createAppointment } = useDB();
  const toast = useToast();
  const [date, setDate] = useState(todayISO());
  const [proFilter, setProFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | AppointmentStatus>('');
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [creating, setCreating] = useState(false);

  const timeline = dayTimeline(db, date, proFilter || undefined).filter((t) => !statusFilter || t.appt.status === statusFilter);
  const dayAppts = db.appointments.filter((a) => a.date === date && a.status !== 'cancelado');
  const revenue = dayAppts.reduce((acc, a) => acc + (a.price || 0), 0);
  const occ = occupancy(db, date, proFilter || undefined);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof timeline>();
    for (const t of timeline) {
      const key = t.appt.professionalId;
      map.set(key, [...(map.get(key) || []), t]);
    }
    return [...map.entries()];
  }, [timeline]);

  return (
    <>
      <div className="section-head">
        <div>
          <span className="eyebrow"><Icon name="calendar" size={13} /> Agenda</span>
          <h1 className="section-title mt-8">Controle de horários</h1>
          <p className="section-kicker">{formatDateLong(date)}</p>
        </div>
        <button className="btn btn-portal" onClick={() => setCreating(true)}>
          <Icon name="plus" size={16} /> Novo agendamento
        </button>
      </div>

      <div className="card">
        <div className="row row-3">
          <div className="field">
            <label>Dia</label>
            <div className="flex">
              <button className="btn btn-icon" onClick={() => setDate(addDays(date, -1))} aria-label="Dia anterior">
                <span style={{ fontSize: 16 }}>‹</span>
              </button>
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value || todayISO())} />
              <button className="btn btn-icon" onClick={() => setDate(addDays(date, 1))} aria-label="Próximo dia">
                <span style={{ fontSize: 16 }}>›</span>
              </button>
            </div>
          </div>
          <div className="field">
            <label>Profissional</label>
            <select className="select" value={proFilter} onChange={(e) => setProFilter(e.target.value)}>
              <option value="">Todos os barbeiros</option>
              {db.professionals.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Status</label>
            <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as AppointmentStatus | '')}>
              <option value="">Todos</option>
              {STATUS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap">
          <button className="btn btn-sm" onClick={() => setDate(todayISO())}>Hoje</button>
          <button className="btn btn-sm" onClick={() => setDate(addDays(todayISO(), 1))}>Amanhã</button>
          <span className="small muted">Antecedência mínima: {db.settings.minLeadMinutes} min · passo de {db.settings.slotMinutes} min</span>
        </div>
      </div>

      <div className="kpi mt-24">
        <StatCard label="Atendimentos" value={dayAppts.length} />
        <StatCard label="Receita prevista" value={brl(revenue)} />
        <StatCard label="Ocupação" value={`${occ.pct}%`} hint={`${Math.round(occ.booked / 60)}h agendadas`} />
        <StatCard label="Pendentes" value={dayAppts.filter((a) => a.status === 'pendente').length} hint="aguardando confirmação" />
      </div>

      <div className="mt-24">
        {grouped.length === 0 ? (
          <Empty icon="🗓️" title="Nenhum atendimento neste dia" text="Use o botão Novo agendamento para encaixar um cliente ou escolha outro dia." />
        ) : (
          grouped.map(([pid, items]) => {
            const pro = db.professionals.find((p) => p.id === pid);
            return (
              <div className="card mb-16" key={pid} style={{ marginBottom: 18 }}>
                <div className="flex-between">
                  <div className="flex">
                    <span className="brand-mark" style={{ background: 'var(--surface-3)' }}>
                      <Icon name="user" />
                    </span>
                    <div>
                      <h3 className="card-title">{pro?.name || 'Profissional removido'}</h3>
                      <p className="small muted">{pro?.role} · {items.length} atendimento(s)</p>
                    </div>
                  </div>
                  <span className="small muted">escala {pro?.start}–{pro?.end}</span>
                </div>
                <div className="divider" />
                <div className="col">
                  {items.map(({ appt, service }) => (
                    <div className="list-row" key={appt.id}>
                      <div className="mono" style={{ width: 62 }}>
                        <strong>{appt.time}</strong>
                        <div className="small muted">{appt.durationMin || service?.durationMin}min</div>
                      </div>
                      <div className="list-row-main">
                        <strong className="truncate">{appt.clientName}</strong>
                        <p className="small muted truncate">
                          {service?.name} · {brl(appt.price)} · {maskPhone(appt.clientPhone)} · cód. {appt.code}
                        </p>
                        {appt.notes && <p className="small muted truncate">obs.: {appt.notes}</p>}
                      </div>
                      <div className="flex flex-wrap">
                        <Badge tone={appt.status === 'confirmado' ? 'ok' : appt.status === 'concluido' ? 'neon' : appt.status === 'cancelado' ? 'danger' : 'warn'}>
                          {appt.status}
                        </Badge>
                        <a
                          className="btn btn-icon btn-sm" title="WhatsApp do cliente"
                          href={`https://wa.me/55${onlyDigits(appt.clientPhone)}?text=${encodeURIComponent(
                            `Olá ${appt.clientName}! Confirmando seu horário na Cris Barber: ${appt.time} (${service?.name}).`
                          )}`}
                          target="_blank" rel="noreferrer"
                        >
                          <Icon name="phone" size={16} />
                        </a>
                        <button className="btn btn-icon btn-sm" title="Editar" onClick={() => setEditing(appt)}>
                          <Icon name="edit" size={16} />
                        </button>
                        {appt.status === 'pendente' && (
                          <button className="btn btn-ok btn-sm" onClick={() => updateAppointment(appt.id, { status: 'confirmado' })}>
                            <Icon name="check" size={15} />
                          </button>
                        )}
                        {appt.status !== 'concluido' && appt.status !== 'cancelado' && (
                          <button className="btn btn-sm" onClick={() => updateAppointment(appt.id, { status: 'concluido' })}>
                            Concluir
                          </button>
                        )}
                        {appt.status !== 'cancelado' && (
                          <ConfirmButton onConfirm={() => updateAppointment(appt.id, { status: 'cancelado' })} className="btn btn-danger btn-sm">
                            Cancelar
                          </ConfirmButton>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {(editing || creating) && (
        <AppointmentModal
          appointment={editing}
          defaultDate={date}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSave={async (data) => {
            const conflict = findConflict(db, {
              professionalId: data.professionalId,
              date: data.date,
              time: data.time,
              durationMin: data.durationMin,
              id: editing?.id,
            });
            if (conflict) {
              toast('Conflito: esse barbeiro já tem atendimento nesse intervalo.', 'err');
              return false;
            }
            if (editing) {
              updateAppointment(editing.id, data);
              toast('Agendamento atualizado.', 'ok');
            } else {
              const res = await createAppointment({ ...data, status: data.status || 'confirmado' });
              if (!res.ok) {
                toast(res.error, 'err');
                return false;
              }
              toast(`Agendamento criado para ${data.clientName} (código ${res.appointment.code}).`, 'ok');
            }
            setEditing(null);
            setCreating(false);
            return true;
          }}
          onDelete={
            editing
              ? () => {
                  removeAppointment(editing.id);
                  setEditing(null);
                  toast('Agendamento excluído.', 'ok');
                }
              : undefined
          }
        />
      )}
    </>
  );
}

function AppointmentModal({
  appointment, defaultDate, onClose, onSave, onDelete,
}: {
  appointment: Appointment | null;
  defaultDate: string;
  onClose: () => void;
  onSave: (data: Omit<Appointment, 'id' | 'createdAt' | 'code'>) => Promise<boolean>;
  onDelete?: () => void;
}) {
  const { db } = useDB();
  const [clientName, setClientName] = useState(appointment?.clientName || '');
  const [clientPhone, setClientPhone] = useState(appointment ? maskPhone(appointment.clientPhone) : '');
  const [serviceId, setServiceId] = useState(appointment?.serviceId || db.services[0]?.id || '');
  const [professionalId, setProfessionalId] = useState(appointment?.professionalId || db.professionals[0]?.id || '');
  const [date, setDate] = useState(appointment?.date || defaultDate);
  const [time, setTime] = useState(appointment?.time || '');
  const [status, setStatus] = useState<AppointmentStatus>(appointment?.status || 'confirmado');
  const [notes, setNotes] = useState(appointment?.notes || '');

  const service = db.services.find((s) => s.id === serviceId);
  const durationMin = service?.durationMin || 30;
  const slots = professionalId && date ? getSlots(db, { professionalId, date, durationMin, ignoreAppointmentId: appointment?.id }) : [];
  const free = slots.filter((s) => s.available);

  const save = async () => {
    if (clientName.trim().length < 3) return;
    if (onlyDigits(clientPhone).length < 10) return;
    if (!time) return;
    await onSave({
      clientName: clientName.trim(),
      clientPhone: onlyDigits(clientPhone),
      serviceId,
      professionalId,
      date,
      time,
      durationMin,
      price: service?.price || 0,
      notes: notes.trim(),
      status,
    });
  };

  return (
    <Modal
      open
      title={appointment ? 'Editar agendamento' : 'Novo agendamento'}
      subtitle={appointment ? `Código ${appointment.code}` : 'Encaixe manual — o sistema valida conflitos de horário'}
      onClose={onClose}
    >
      <div className="row row-2">
        <div className="field">
          <label>Cliente *</label>
          <input className="input" value={clientName} onChange={(e) => setClientName(e.target.value)} />
        </div>
        <div className="field">
          <label>WhatsApp *</label>
          <input className="input" inputMode="tel" value={clientPhone} onChange={(e) => setClientPhone(maskPhone(e.target.value))} />
        </div>
        <div className="field">
          <label>Serviço</label>
          <select className="select" value={serviceId} onChange={(e) => { setServiceId(e.target.value); setTime(''); }}>
            {db.services.map((s) => (
              <option key={s.id} value={s.id}>{s.name} · {formatDuration(s.durationMin)} · {brl(s.price)}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Profissional</label>
          <select className="select" value={professionalId} onChange={(e) => { setProfessionalId(e.target.value); setTime(''); }}>
            {db.professionals.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Data</label>
          <input className="input" type="date" value={date} onChange={(e) => { setDate(e.target.value); setTime(''); }} />
        </div>
        <div className="field">
          <label>Status</label>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value as AppointmentStatus)}>
            {STATUS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label>Horário (somente livres) — {free.length} opções</label>
        {free.length === 0 ? (
          <p className="small muted">Nenhum horário livre nesse dia para {db.professionals.find((p) => p.id === professionalId)?.name}.</p>
        ) : (
          <div className="slot-grid">
            {free.map((s) => (
              <button key={s.time} className={`slot ${time === s.time ? 'slot-on' : ''}`} onClick={() => setTime(s.time)}>
                {s.time}
              </button>
            ))}
          </div>
        )}
        {appointment && time && !free.some((s) => s.time === time) && (
          <p className="small muted">Horário atual do agendamento: {appointment.time} (fora da grade livre)</p>
        )}
      </div>

      <div className="field">
        <label>Observações</label>
        <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="flex-between flex-wrap">
        <div className="flex">
          <button className="btn btn-portal" onClick={save} disabled={!time}>
            <Icon name="check" size={16} /> Salvar
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Fechar</button>
        </div>
        {onDelete && <ConfirmButton onConfirm={onDelete}><Icon name="trash" size={15} /> Excluir</ConfirmButton>}
      </div>

      <p className="small muted mt-16">
        Total estimado: <strong>{brl(service?.price || 0)}</strong> · início {time ? `${toMinutes(time) / 60}h` : '—'} ·
        duração {formatDuration(durationMin)}
      </p>
    </Modal>
  );
}
