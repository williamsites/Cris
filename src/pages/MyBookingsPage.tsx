import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDB } from '../data/store';
import { Icon } from '../components/Icon';
import { Badge, ConfirmButton, Empty } from '../components/ui';
import { useToast } from '../components/Toast';
import { brl, formatDateLong, formatDuration, maskPhone, onlyDigits, todayISO } from '../lib/utils';

const STORE = 'crisbarber.myphone';

export default function MyBookingsPage() {
  const { db, listMyBookings, cancelMyBooking, mode } = useDB();
  const toast = useToast();
  const [phone, setPhone] = useState(() => localStorage.getItem(STORE) || '');
  const [query, setQuery] = useState('');
  const [mine, setMine] = useState<typeof db.appointments>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (phone.length >= 10) {
      localStorage.setItem(STORE, phone);
      setQuery(onlyDigits(phone));
    }
  }, [phone]);

  useEffect(() => {
    let alive = true;
    if (!query) {
      setMine([]);
      return;
    }
    setLoading(true);
    listMyBookings(query)
      .then((list) => {
        if (alive) setMine([...list].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)));
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, db.appointments]);

  const today = todayISO();
  const upcoming = mine.filter((a) => a.date >= today && a.status !== 'cancelado');
  const past = mine.filter((a) => a.date < today || a.status === 'cancelado');

  const cancel = async (id: string) => {
    const ok = await cancelMyBooking(query, id);
    if (!ok) return toast('Não foi possível cancelar agora. Fale com a barbearia no WhatsApp.', 'err');
    setMine((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'cancelado' } : a)));
    toast('Agendamento cancelado. Você pode marcar outro horário quando quiser.', 'ok');
  };

  return (
    <>
      <div className="banner" style={{ padding: 26, marginBottom: 26 }}>
        <span className="eyebrow"><Icon name="clock" size={13} /> Área do cliente</span>
        <h1 className="section-title mt-16">Meus agendamentos</h1>
        <p className="section-kicker">
          Confira, acompanhe ou cancele seus horários na Cris Barber.
          {mode === 'remote' ? ' Agenda sincronizada com a barbearia.' : ''}
        </p>
      </div>

      <div className="card" style={{ maxWidth: 520 }}>
        <div className="field">
          <label>Informe seu WhatsApp (o mesmo usado no agendamento)</label>
          <input
            className="input" inputMode="tel" value={phone}
            onChange={(e) => setPhone(maskPhone(e.target.value))} placeholder="(51) 99999-9999"
          />
        </div>
        {loading && <p className="small muted">Buscando seus agendamentos...</p>}
        {mine.length > 0 && (
          <p className="small muted">
            {mine.length} agendamento{mine.length > 1 ? 's' : ''} encontrado{mine.length > 1 ? 's' : ''}.
          </p>
        )}
        {query && mine.length === 0 && (
          <p className="small muted">Nenhum agendamento encontrado para esse número.</p>
        )}
      </div>

      {upcoming.length > 0 && (
        <section className="section">
          <h2 className="section-title">Próximos</h2>
          <div className="col mt-16">
            {upcoming.map((a) => {
              const svc = db.services.find((s) => s.id === a.serviceId);
              const pro = db.professionals.find((p) => p.id === a.professionalId);
              return (
                <div className="card" key={a.id}>
                  <div className="flex-between flex-wrap">
                    <div className="flex">
                      <span className="brand-mark" style={{ background: 'var(--surface-3)' }}>
                        <Icon name="calendar" />
                      </span>
                      <div>
                        <h3 className="card-title">{svc?.name || 'Serviço'}</h3>
                        <p className="small muted">
                          {formatDateLong(a.date)} às {a.time} · {formatDuration(a.durationMin)} · com {pro?.name}
                        </p>
                      </div>
                    </div>
                    <Badge tone={a.status === 'confirmado' ? 'ok' : a.status === 'concluido' ? 'neon' : 'warn'}>
                      {a.status}
                    </Badge>
                  </div>
                  <div className="divider" />
                  <div className="flex-between flex-wrap">
                    <span className="small muted">
                      Código <strong style={{ color: '#fff' }}>{a.code}</strong> · {brl(a.price)}
                      {a.notes ? ` · obs.: ${a.notes}` : ''}
                    </span>
                    <div className="flex">
                      <a
                        className="btn btn-sm"
                        href={`https://wa.me/${db.settings.whatsapp}?text=${encodeURIComponent(
                          `Olá! Sobre meu agendamento ${a.code} (${svc?.name}) em ${a.date} às ${a.time}.`
                        )}`}
                        target="_blank" rel="noreferrer"
                      >
                        <Icon name="phone" size={15} /> Falar com a barbearia
                      </a>
                      <ConfirmButton onConfirm={() => cancel(a.id)} confirmLabel="Cancelar agora?">
                        <Icon name="x" size={15} /> Cancelar
                      </ConfirmButton>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="section">
          <h2 className="section-title">Histórico</h2>
          <div className="table-wrap mt-16">
            <table>
              <thead>
                <tr><th>Data</th><th>Serviço</th><th>Barbeiro</th><th>Valor</th><th>Status</th></tr>
              </thead>
              <tbody>
                {past.map((a) => (
                  <tr key={a.id}>
                    <td className="mono">{a.date} {a.time}</td>
                    <td>{db.services.find((s) => s.id === a.serviceId)?.name || '—'}</td>
                    <td>{db.professionals.find((p) => p.id === a.professionalId)?.name || '—'}</td>
                    <td className="mono">{brl(a.price)}</td>
                    <td><Badge tone={a.status === 'cancelado' ? 'danger' : 'neon'}>{a.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!query && (
        <Empty
          icon="📱"
          title="Digite seu WhatsApp para ver seus horários"
          text="Usamos o número informado no agendamento para localizar suas reservas neste dispositivo."
          action={<Link className="btn btn-portal" to="/agendar">Quero agendar agora</Link>}
        />
      )}
    </>
  );
}
