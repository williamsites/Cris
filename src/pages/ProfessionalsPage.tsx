import { Link } from 'react-router-dom';
import { useDB } from '../data/store';
import { Badge, SmartImage } from '../components/ui';
import { Icon } from '../components/Icon';
import { nextAvailable } from '../lib/scheduling';
import { WEEKDAYS_SHORT, formatDateLong } from '../lib/utils';

export default function ProfessionalsPage() {
  const { db } = useDB();
  const pros = db.professionals.filter((p) => p.active);

  return (
    <>
      <div className="banner" style={{ padding: 26, marginBottom: 26 }}>
        <span className="eyebrow"><Icon name="users" size={13} /> Equipe</span>
        <h1 className="section-title mt-16">Nossos barbeiros</h1>
        <p className="section-kicker" style={{ maxWidth: 620 }}>
          Cada barbeiro tem a própria agenda. Escolha o seu e o sistema mostra somente os horários livres dele.
        </p>
      </div>

      <div className="grid grid-2">
        {pros.map((p) => {
          const services = p.serviceIds.length ? db.services.filter((s) => p.serviceIds.includes(s.id)) : db.services.filter((s) => s.active);
          const next = nextAvailable(db, { professionalId: p.id, durationMin: 30 });
          return (
            <article key={p.id} className="card">
              <div className="flex" style={{ alignItems: 'flex-start' }}>
                <SmartImage src={p.photo} alt={p.name} className="avatar" emoji="🧑‍🔧" style={{ width: 74, height: 74, borderRadius: 20 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex-between flex-wrap">
                    <h3 style={{ fontSize: 18 }}>{p.name}</h3>
                    <Badge tone="neon"><Icon name="star" size={12} /> {p.rating.toFixed(1)}</Badge>
                  </div>
                  <p className="small muted">{p.role}</p>
                  <p className="card-muted small mt-8">{p.bio}</p>
                </div>
              </div>

              <div className="divider" />
              <div className="small muted">
                <Icon name="clock" size={13} />{' '}
                {p.workdays.map((w) => WEEKDAYS_SHORT[w]).join(' · ')} · {p.start}–{p.end}
              </div>
              <div className="flex-wrap flex mt-8">
                {services.slice(0, 5).map((s) => (
                  <Badge key={s.id}>{s.name}</Badge>
                ))}
                {services.length > 5 && <Badge>+{services.length - 5}</Badge>}
              </div>

              {next && (
                <div className="notice small mt-16">
                  Próxima vaga: <strong>{formatDateLong(next.date)}</strong> às <strong>{next.time}</strong>
                </div>
              )}
              <div className="flex mt-16">
                <Link className="btn btn-portal" to={`/agendar?prof=${p.id}`}>
                  <Icon name="calendar" size={16} /> Agendar com {p.name.split(' ')[0]}
                </Link>
                <span className="small muted">{services.length} serviços disponíveis na agenda</span>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
