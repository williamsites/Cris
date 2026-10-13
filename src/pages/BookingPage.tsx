import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDB } from '../data/store';
import { Icon } from '../components/Icon';
import { Badge, Empty, SmartImage } from '../components/ui';
import { useToast } from '../components/Toast';
import { daySummary, getSlots, isSlotFree, professionalsForService } from '../lib/scheduling';
import type { Appointment } from '../data/types';
import {
  addDays, brl, formatDateLong, formatDuration, maskPhone, onlyDigits, todayISO, weekdayOf, WEEKDAYS_SHORT,
} from '../lib/utils';

const STEP_LABELS = ['Serviço', 'Barbeiro', 'Data e hora', 'Seus dados'];

function icsFor(a: Appointment, serviceName: string, proName: string, shop: string, address: string) {
  const [h, m] = a.time.split(':').map(Number);
  const start = new Date(a.date + 'T00:00:00');
  start.setHours(h, m, 0, 0);
  const end = new Date(start.getTime() + (a.durationMin || 30) * 60000);
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}T${String(
      d.getUTCHours()
    ).padStart(2, '0')}${String(d.getUTCMinutes()).padStart(2, '0')}00Z`;
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Cris Barber//Agenda//PT-BR', 'BEGIN:VEVENT',
    `UID:${a.id}@crisbarber`, `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
    `SUMMARY:${serviceName} - ${shop}`, `DESCRIPTION:Barbeiro: ${proName} | Codigo: ${a.code}`,
    `LOCATION:${address}`, 'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}

export default function BookingPage() {
  const { db, createAppointment } = useDB();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const s = db.settings;

  const [serviceId, setServiceId] = useState(params.get('servico') || '');
  const [proId, setProId] = useState(params.get('prof') || '');
  const [date, setDate] = useState(params.get('data') || todayISO());
  const [time, setTime] = useState(params.get('hora') || '');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [done, setDone] = useState<Appointment | null>(null);

  const service = db.services.find((x) => x.id === serviceId);
  const pro = db.professionals.find((x) => x.id === proId);
  const duration = service?.durationMin || 30;

  const step = !service ? 0 : !pro ? 1 : !time ? 2 : 3;

  const prosAvailable = useMemo(() => (service ? professionalsForService(db, service.id) : []), [db, service]);

  // se o barbeiro escolhido não atende o serviço selecionado, limpa
  useEffect(() => {
    if (service && pro && !(pro.serviceIds.length === 0 || pro.serviceIds.includes(service.id))) {
      setProId('');
    }
  }, [service, pro]);

  // gera a faixa de dias com disponibilidade real
  const days = useMemo(() => {
    if (!pro) return [];
    const out: { date: string; free: number; open: boolean }[] = [];
    for (let i = 0; i < s.daysAhead; i++) {
      const d = addDays(todayISO(), i);
      const sum = daySummary(db, { professionalId: pro.id, date: d, durationMin: duration });
      out.push({ date: d, free: sum.free, open: sum.open });
    }
    return out;
  }, [db, pro, duration, s.daysAhead]);

  const slots = useMemo(
    () => (pro && date ? getSlots(db, { professionalId: pro.id, date, durationMin: duration }) : []),
    [db, pro, date, duration]
  );

  const freeCount = slots.filter((x) => x.available).length;
  const shopHours = s.hours[weekdayOf(date)];

  const reset = () => {
    setDone(null);
    setTime('');
    setName('');
    setPhone('');
    setNotes('');
    setParams({});
  };

  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!service || !pro) return;
    const digits = onlyDigits(phone);
    if (name.trim().length < 3) return toast('Informe seu nome completo.', 'err');
    if (digits.length < 10) return toast('Informe um WhatsApp válido com DDD.', 'err');
    if (!time) return toast('Escolha um horário disponível.', 'err');
    if (!isSlotFree(db, pro.id, date, time, duration)) {
      toast('Esse horário acabou de ser reservado. Escolha outro.', 'err');
      setTime('');
      return;
    }
    setSending(true);
    const res = await createAppointment({
      clientName: name.trim(),
      clientPhone: digits,
      serviceId: service.id,
      professionalId: pro.id,
      date,
      time,
      durationMin: duration,
      price: service.price,
      notes: notes.trim(),
      status: 'pendente',
    });
    setSending(false);
    if (!res.ok) {
      toast(res.error, 'err');
      setTime('');
      return;
    }
    setDone(res.appointment);
    toast('Horário reservado com sucesso! 💈', 'ok');
  };

  /* ---------------- CONFIRMAÇÃO ---------------- */
  if (done) {
    const svc = db.services.find((x) => x.id === done.serviceId)!;
    const pr = db.professionals.find((x) => x.id === done.professionalId)!;
    const ics = icsFor(done, svc.name, pr.name, s.shopName, `${s.address}, ${s.city}`);
    const waText = encodeURIComponent(
      `Olá! Sou ${done.clientName}. Acabei de agendar pelo site: ${svc.name} com ${pr.name} em ${formatDateLong(
        done.date
      )} às ${done.time}. Código ${done.code}.`
    );
    return (
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div className="card card-glow" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 46 }}>✅</div>
          <h1 className="section-title mt-8">Horário reservado!</h1>
          <p className="section-kicker">
            Aguarde a confirmação da barbearia. Guarde seu código: <strong style={{ color: '#fff' }}>{done.code}</strong>
          </p>
        </div>

        <div className="card mt-16">
          <div className="flex-between">
            <h3 className="card-title">Resumo da reserva</h3>
            <Badge tone={done.status === 'confirmado' ? 'ok' : 'warn'}>{done.status}</Badge>
          </div>
          <div className="divider" />
          <div className="col">
            <div className="list-row">
              <SmartImage src={pr.photo} alt={pr.name} className="avatar avatar-sm" emoji="🧑‍🔧" />
              <div className="list-row-main">
                <strong>{pr.name}</strong>
                <p className="small muted">{pr.role}</p>
              </div>
            </div>
            <div className="list-row">
              <span className="avatar avatar-sm" style={{ display: 'grid', placeItems: 'center' }}>
                <Icon name="calendar" size={18} />
              </span>
              <div className="list-row-main">
                <strong>{formatDateLong(done.date)}</strong>
                <p className="small muted">
                  {done.time} · {formatDuration(done.durationMin)} · {brl(done.price)}
                </p>
              </div>
            </div>
            <div className="list-row">
              <span className="avatar avatar-sm" style={{ display: 'grid', placeItems: 'center' }}>
                <Icon name="scissors" size={18} />
              </span>
              <div className="list-row-main">
                <strong>{svc.name}</strong>
                <p className="small muted">{s.address} · {s.city}</p>
              </div>
            </div>
          </div>
          <div className="col mt-16">
            <a className="btn btn-portal btn-block" href={`https://wa.me/${s.whatsapp}?text=${waText}`} target="_blank" rel="noreferrer">
              <Icon name="phone" size={17} /> Confirmar no WhatsApp
            </a>
            <a
              className="btn btn-ghost btn-block"
              href={`data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`}
              download={`cris-barber-${done.code}.ics`}
            >
              <Icon name="download" size={17} /> Adicionar à agenda do celular
            </a>
            <div className="flex">
              <Link className="btn btn-ghost" to="/meus-agendamentos">
                <Icon name="clock" size={16} /> Meus agendamentos
              </Link>
              <button className="btn" onClick={reset}>Novo agendamento</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- WIZARD ---------------- */
  return (
    <>
      <div className="section-head">
        <div>
          <span className="eyebrow"><Icon name="calendar" size={13} /> Agendamento inteligente</span>
          <h1 className="section-title mt-8">Reserve seu horário</h1>
          <p className="section-kicker">
            O sistema cruza a escala do barbeiro, a duração do serviço e os clientes já marcados — você só vê o que está livre.
          </p>
        </div>
      </div>

      <div className="steps">
        {STEP_LABELS.map((l, i) => (
          <div key={l} className={`step ${i === step ? 'on' : ''} ${i < step ? 'done' : ''}`}>
            <b>{i < step ? '✓' : i + 1}</b> {l}
          </div>
        ))}
      </div>

      <div className="row row-2" style={{ alignItems: 'start' }}>
        <div className="col">
          {/* 1 · SERVIÇO */}
          <div className="card">
            <h3 className="card-title">1 · Escolha o serviço</h3>
            <div className="grid mt-16" style={{ gap: 10 }}>
              {db.services.filter((x) => x.active).map((x) => (
                <button
                  key={x.id}
                  className="list-row"
                  onClick={() => {
                    setServiceId(x.id);
                    setTime('');
                    setParams((p) => ({ ...Object.fromEntries(p), servico: x.id }));
                  }}
                  style={{
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                    borderColor: serviceId === x.id ? 'var(--neon-2)' : 'var(--line)',
                    background: serviceId === x.id ? 'var(--neon-soft)' : 'var(--surface)',
                  }}
                >
                  <SmartImage src={x.image} alt={x.name} className="avatar avatar-sm" />
                  <span className="list-row-main">
                    <strong>{x.name}</strong>
                    <span className="small muted" style={{ display: 'block' }}>
                      {formatDuration(x.durationMin)} · {brl(x.price)}
                    </span>
                  </span>
                  {serviceId === x.id && <Icon name="check" />}
                </button>
              ))}
            </div>
          </div>

          {/* 2 · BARBEIRO */}
          {service && (
            <div className="card">
              <h3 className="card-title">2 · Escolha o barbeiro</h3>
              {prosAvailable.length === 0 ? (
                <Empty icon="🧑‍🔧" title="Nenhum barbeiro para este serviço" text="Fale com a barbearia pelo WhatsApp." />
              ) : (
                <div className="grid mt-16" style={{ gap: 10 }}>
                  {prosAvailable.map((p) => {
                    const sum = daySummary(db, { professionalId: p.id, date, durationMin: duration });
                    return (
                      <button
                        key={p.id}
                        className="list-row"
                        onClick={() => {
                          setProId(p.id);
                          setTime('');
                          setParams((prev) => ({ ...Object.fromEntries(prev), servico: service.id, prof: p.id }));
                        }}
                        style={{
                          cursor: 'pointer', textAlign: 'left', width: '100%',
                          borderColor: proId === p.id ? 'var(--neon-2)' : 'var(--line)',
                          background: proId === p.id ? 'var(--neon-soft)' : 'var(--surface)',
                        }}
                      >
                        <SmartImage src={p.photo} alt={p.name} className="avatar avatar-sm" emoji="🧑‍🔧" />
                        <span className="list-row-main">
                          <strong>{p.name}</strong>
                          <span className="small muted" style={{ display: 'block' }}>
                            {p.role} · {sum.free > 0 ? `${sum.free} horários livres nesse dia` : 'sem vaga nesse dia'}
                          </span>
                        </span>
                        {proId === p.id && <Icon name="check" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 3 · DATA E HORA */}
          {service && pro && (
            <div className="card">
              <h3 className="card-title">3 · Escolha o dia e o horário</h3>
              <p className="small muted mt-8">
                Dias fechados ou sem vaga aparecem apagados. A duração de {formatDuration(duration)} já está considerada.
              </p>
              <div className="day-strip mt-16">
                {days.map((d) => {
                  const wd = weekdayOf(d.date);
                  const off = !d.open || d.free === 0;
                  return (
                    <button
                      key={d.date}
                      className={`day ${off ? 'is-off' : ''} ${date === d.date ? 'is-on' : ''}`}
                      disabled={off}
                      onClick={() => {
                        setDate(d.date);
                        setTime('');
                        setParams((prev) => ({ ...Object.fromEntries(prev), data: d.date }));
                      }}
                    >
                      <span>{WEEKDAYS_SHORT[wd]}</span>
                      <b>{Number(d.date.slice(-2))}</b>
                      <span style={{ color: off ? 'var(--danger)' : 'var(--ok)' }}>
                        {!d.open ? 'fechado' : d.free === 0 ? 'cheio' : `${d.free} vagas`}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="divider" />
              <div className="flex-between flex-wrap">
                <h4 style={{ fontSize: 15 }}>{formatDateLong(date)}</h4>
                <span className="small muted">
                  {shopHours?.open && pro ? `${pro.start}–${pro.end}` : 'sem atendimento'} · {freeCount} horários livres
                </span>
              </div>

              {freeCount === 0 ? (
                <Empty
                  icon="😕"
                  title="Nenhum horário livre nesse dia"
                  text="Escolha outro dia ou outro barbeiro — os dias com vaga estão destacados na faixa acima."
                />
              ) : (
                <div className="slot-grid mt-16">
                  {slots.map((sl) => (
                    <button
                      key={sl.time}
                      className={`slot ${time === sl.time ? 'slot-on' : ''} ${sl.available ? '' : 'slot-off'}`}
                      disabled={!sl.available}
                      title={sl.label || (sl.available ? 'Disponível' : '')}
                      onClick={() => {
                        setTime(sl.time);
                        setParams((prev) => ({ ...Object.fromEntries(prev), hora: sl.time }));
                      }}
                    >
                      {sl.time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RESUMO */}
        <div className="col">
          <div className="card card-glow" style={{ position: 'sticky', top: 90 }}>
            <h3 className="card-title">Resumo</h3>
            <div className="divider" />
            <div className="col">
              <Row icon="scissors" label="Serviço" value={service ? `${service.name}` : '—'} sub={service ? formatDuration(service.durationMin) : ''} />
              <Row icon="user" label="Barbeiro" value={pro ? pro.name : '—'} sub={pro?.role || ''} />
              <Row icon="calendar" label="Data" value={time ? formatDateLong(date) : '—'} sub={time ? `às ${time}` : ''} />
            </div>

            {service && pro && time && (
              <>
                <div className="divider" />
                <div className="flex-between">
                  <span className="muted">Total estimado</span>
                  <span className="price" style={{ fontSize: 22 }}>{brl(service.price)}</span>
                </div>
              </>
            )}

            <div className="divider" />
            {step === 3 ? (
              <div className="col">
                <div className="field">
                  <label>Seu nome completo *</label>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: João da Silva" />
                </div>
                <div className="field">
                  <label>WhatsApp com DDD *</label>
                  <input
                    className="input" inputMode="tel" value={phone}
                    onChange={(e) => setPhone(maskPhone(e.target.value))} placeholder="(51) 99999-9999"
                  />
                </div>
                <div className="field">
                  <label>Observação (opcional)</label>
                  <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: degradê baixo, barba na navalha..." />
                </div>
                <button className="btn btn-portal btn-lg btn-block" onClick={submit} disabled={sending}>
                  <Icon name="check" size={18} /> {sending ? 'Reservando...' : 'Confirmar reserva'}
                </button>
                <p className="small muted">
                  Ao confirmar você aceita receber o contato da barbearia no WhatsApp para confirmação do horário.
                </p>
              </div>
            ) : (
              <div className="notice small">
                Complete as etapas ao lado: {service ? '' : 'escolha o serviço'}{service && !pro ? 'escolha o barbeiro' :
                  service && pro && !time ? 'escolha data e horário' : ''}.
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="card-title" style={{ fontSize: 15 }}>Como funciona o agendamento inteligente</h3>
            <ul className="small soft mt-16" style={{ paddingLeft: 18, lineHeight: 1.8 }}>
              <li>Cada barbeiro tem escala própria (dias e horários).</li>
              <li>A duração do serviço bloqueia o tempo real necessário.</li>
              <li>Clientes já marcados aparecem bloqueados para todos.</li>
              <li>Horários que já passaram hoje não são exibidos.</li>
              <li>Antecedência mínima de {s.minLeadMinutes} minutos.</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ icon, label, value, sub }: { icon: 'scissors' | 'user' | 'calendar'; label: string; value: string; sub?: string }) {
  return (
    <div className="flex" style={{ alignItems: 'flex-start' }}>
      <span className="avatar avatar-sm" style={{ display: 'grid', placeItems: 'center', width: 34, height: 34 }}>
        <Icon name={icon} size={16} />
      </span>
      <div style={{ minWidth: 0 }}>
        <p className="small muted">{label}</p>
        <strong>{value}</strong>
        {sub && <p className="small muted">{sub}</p>}
      </div>
    </div>
  );
}
