import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDB } from '../data/store';
import { Icon } from '../components/Icon';
import { Badge, SmartImage } from '../components/ui';
import { nextAvailable, professionalsForService } from '../lib/scheduling';
import { brl, formatDateLong, formatDuration, todayISO, WEEKDAYS_SHORT } from '../lib/utils';

function ServiceCard({ id }: { id: string }) {
  const { db } = useDB();
  const svc = db.services.find((s) => s.id === id)!;
  const pros = professionalsForService(db, svc.id).length;
  return (
    <article className="card card-hover media-card">
      <div className="media-thumb">
        <SmartImage src={svc.image} alt={svc.name} />
        <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 2 }}>
          <Badge tone="neon">{formatDuration(svc.durationMin)}</Badge>
        </div>
      </div>
      <div className="media-body">
        <h3 className="card-title">{svc.name}</h3>
        <p className="card-muted">{svc.description}</p>
        <div className="small muted">
          {pros} profissional{pros > 1 ? 'is' : ''} disponível{pros > 1 ? 'is' : ''}
        </div>
        <div className="media-foot">
          <span className="price">{brl(svc.price)}</span>
          <Link className="btn btn-portal btn-sm" to={`/agendar?servico=${svc.id}`}>
            Agendar
          </Link>
        </div>
      </div>
    </article>
  );
}

function ProCard({ id }: { id: string }) {
  const { db } = useDB();
  const pro = db.professionals.find((p) => p.id === id)!;
  const next = useMemo(
    () => nextAvailable(db, { professionalId: pro.id, durationMin: 30 }),
    [db, pro.id]
  );
  return (
    <article className="card card-hover media-card">
      <div className="media-thumb" style={{ aspectRatio: '4 / 3' }}>
        <SmartImage src={pro.photo} alt={pro.name} emoji="🧑‍🔧" />
        <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 2, display: 'flex', gap: 6 }}>
          <Badge tone="neon">
            <Icon name="star" size={12} /> {pro.rating.toFixed(1)}
          </Badge>
        </div>
      </div>
      <div className="media-body">
        <h3 className="card-title">{pro.name}</h3>
        <p className="small muted">{pro.role}</p>
        <p className="card-muted">{pro.bio}</p>
        <div className="small muted">
          Atende: {pro.workdays.map((w) => WEEKDAYS_SHORT[w]).join(' · ')}
        </div>
        {next && (
          <div className="notice small">
            Próxima vaga: <strong>{formatDateLong(next.date)}</strong> às <strong>{next.time}</strong>
          </div>
        )}
        <div className="media-foot">
          <Link className="btn btn-portal btn-sm" to={`/agendar?prof=${pro.id}`}>
            <Icon name="calendar" size={15} /> Reservar
          </Link>
        </div>
      </div>
    </article>
  );
}

function ProductCard({ id }: { id: string }) {
  const { db } = useDB();
  const p = db.products.find((x) => x.id === id)!;
  const price = p.promoPrice ?? p.price;
  return (
    <article className="card card-hover media-card">
      <div className="media-thumb" style={{ aspectRatio: '1 / 1' }}>
        <SmartImage src={p.image} alt={p.name} emoji={p.emoji} />
        {p.promoPrice && (
          <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 2 }}>
            <Badge tone="ok">-{Math.round(100 - (p.promoPrice / p.price) * 100)}%</Badge>
          </div>
        )}
      </div>
      <div className="media-body">
        <h3 className="card-title" style={{ fontSize: 15 }}>{p.name}</h3>
        <p className="card-muted small">{p.description}</p>
        <div className="media-foot">
          <span className="price">
            {brl(price)}
            {p.promoPrice && (
              <small style={{ textDecoration: 'line-through', marginLeft: 7 }}>{brl(p.price)}</small>
            )}
          </span>
          <Link className="btn btn-sm" to="/produtos">
            <Icon name="bag" size={15} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const { db } = useDB();
  const s = db.settings;
  const featured = db.services.filter((x) => x.active && x.featured);
  const services = (featured.length ? featured : db.services.filter((x) => x.active)).slice(0, 6);
  const pros = db.professionals.filter((p) => p.active);
  const products = db.products.filter((p) => p.active).slice(0, 4);
  const banners = db.banners.filter((b) => b.active);
  const today = todayISO();
  const hours = s.hours[new Date().getDay()];

  const anyNext = useMemo(() => {
    for (const p of pros) {
      const n = nextAvailable(db, { professionalId: p.id, durationMin: 30 });
      if (n) return { ...n, pro: p };
    }
    return null;
  }, [db, pros]);

  const bookingsToday = db.appointments.filter((a) => a.date === today && a.status !== 'cancelado').length;

  return (
    <>
      {/* ---------------- HERO ---------------- */}
      <section className="banner banner-hero" style={{ backgroundImage: `url(${s.coverUrl})` }}>
        <div className="banner-body">
          <span className="eyebrow">
            <Icon name="pin" size={13} /> {s.address} · {s.city}
          </span>
          <h1 className="hero-title">
            Seu corte, seu barbeiro,
            <br />
            <span className="iridescent">seu horário.</span>
          </h1>
          <p className="hero-sub">
            Agendamento inteligente na {s.shopName}: o sistema mostra apenas os horários realmente livres do
            profissional que você escolher. Sem fila, sem espera, sem ligação.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-portal btn-lg" to="/agendar">
              <Icon name="calendar" size={19} /> Agendar agora
            </Link>
            <Link className="btn btn-ghost btn-lg" to="/servicos">
              <Icon name="scissors" size={19} /> Ver serviços e preços
            </Link>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <b>{bookingsToday}</b>
              <span>atendimentos hoje</span>
            </div>
            <div className="hero-stat">
              <b>{pros.length}</b>
              <span>barbeiros ativos</span>
            </div>
            <div className="hero-stat">
              <b>{db.services.filter((x) => x.active).length}</b>
              <span>serviços no menu</span>
            </div>
            <div className="hero-stat">
              <b>{hours?.open ? `${hours.start}–${hours.end}` : 'Fechado'}</b>
              <span>hoje ({WEEKDAYS_SHORT[new Date().getDay()]})</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- PRÓXIMA VAGA ---------------- */}
      {anyNext && (
        <section className="banner-strip">
          <div className="card card-glow" style={{ gridColumn: 'span 2' }}>
            <div className="flex-between flex-wrap">
              <div className="flex">
                <span className="brand-mark" style={{ background: 'var(--surface-3)' }}>
                  <Icon name="clock" />
                </span>
                <div>
                  <p className="small muted">Próxima vaga disponível agora</p>
                  <h3 style={{ fontSize: 20 }}>
                    {formatDateLong(anyNext.date)} às {anyNext.time}
                  </h3>
                  <p className="small muted mt-8">com {anyNext.pro.name} · {anyNext.pro.role}</p>
                </div>
              </div>
              <Link className="btn btn-portal" to={`/agendar?prof=${anyNext.pro.id}&data=${anyNext.date}&hora=${anyNext.time}`}>
                <Icon name="check" size={17} /> Reservar essa vaga
              </Link>
            </div>
          </div>
          <div className="card">
            <div className="flex">
              <span className="brand-mark" style={{ background: 'var(--surface-3)' }}>
                <Icon name="instagram" />
              </span>
              <div>
                <p className="small muted">Resultados no Instagram</p>
                <h3 style={{ fontSize: 17 }}>{s.instagramHandle}</h3>
              </div>
            </div>
            <a className="btn btn-sm mt-16" href={s.instagram} target="_blank" rel="noreferrer">
              Abrir perfil
            </a>
          </div>
        </section>
      )}

      {/* ---------------- BANNERS ADM ---------------- */}
      {banners.length > 0 && (
        <section className="section">
          <div className="section-head">
            <div>
              <h2 className="section-title">Novidades da casa</h2>
              <p className="section-kicker">Quadros gerenciados pelo painel ADM</p>
            </div>
          </div>
          <div className="banner-strip">
            {banners.slice(0, 3).map((b) => (
              <div key={b.id} className="banner card-hover" style={{ minHeight: 210 }}>
                <div
                  style={{
                    position: 'absolute', inset: 0, backgroundImage: `url(${b.image})`,
                    backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.5,
                  }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(4,5,10,.35), rgba(4,5,10,.95))' }} />
                <div style={{ position: 'relative', padding: 20, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 210, justifyContent: 'flex-end' }}>
                  <h3 style={{ fontSize: 18 }}>{b.title}</h3>
                  <p className="small" style={{ color: 'var(--text-soft)' }}>{b.text}</p>
                  {b.ctaLabel && (
                    <Link className="btn btn-portal btn-sm" to={b.ctaUrl || '/agendar'} style={{ alignSelf: 'flex-start' }}>
                      {b.ctaLabel}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------------- DESTAQUES ---------------- */}
      <section className="section">
        <div className="grid grid-4">
          {s.highlights.map((h) => (
            <div className="card card-tight" key={h.title}>
              <div style={{ fontSize: 26 }}>{h.icon}</div>
              <h3 className="card-title mt-8" style={{ fontSize: 15 }}>{h.title}</h3>
              <p className="card-muted small">{h.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- SERVIÇOS ---------------- */}
      <section className="section">
        <div className="section-head">
          <div>
            <h2 className="section-title">Serviços em destaque</h2>
            <p className="section-kicker">Preços e duração reais — o horário é calculado pela duração do serviço</p>
          </div>
          <Link className="btn btn-ghost btn-sm" to="/servicos">
            Ver todos <Icon name="trending" size={15} />
          </Link>
        </div>
        <div className="grid grid-3">
          {services.map((sv) => (
            <ServiceCard key={sv.id} id={sv.id} />
          ))}
        </div>
      </section>

      {/* ---------------- PROFISSIONAIS ---------------- */}
      <section className="section">
        <div className="section-head">
          <div>
            <h2 className="section-title">Nossos barbeiros</h2>
            <p className="section-kicker">Escolha seu profissional e reserve o horário dele</p>
          </div>
          <Link className="btn btn-ghost btn-sm" to="/profissionais">
            Ver equipe completa
          </Link>
        </div>
        <div className="grid grid-3">
          {pros.map((p) => (
            <ProCard key={p.id} id={p.id} />
          ))}
        </div>
      </section>

      {/* ---------------- PRODUTOS ---------------- */}
      <section className="section">
        <div className="section-head">
          <div>
            <h2 className="section-title">Loja Cris Barber</h2>
            <p className="section-kicker">Leve o mesmo produto usado no seu atendimento</p>
          </div>
          <Link className="btn btn-ghost btn-sm" to="/produtos">
            Ver loja
          </Link>
        </div>
        <div className="grid grid-4">
          {products.map((p) => (
            <ProductCard key={p.id} id={p.id} />
          ))}
        </div>
      </section>

      {/* ---------------- GALERIA + INFO ---------------- */}
      <section className="section">
        <div className="row row-2" style={{ alignItems: 'start' }}>
          <div>
            <h2 className="section-title">Ambiente Cris Barber</h2>
            <p className="section-kicker">Fotos da barbearia na Av. Feitoria</p>
            <div className="gallery mt-16">
              {s.gallery.slice(0, 6).map((g, i) => (
                <div className="gallery-item" key={i}>
                  <img src={g} alt={`Cris Barber ${i + 1}`} loading="lazy" />
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h2 className="section-title" style={{ fontSize: 20 }}>Horário de funcionamento</h2>
            <div className="mt-16 list">
              {s.hours.map((h, i) => (
                <div key={i} className="flex-between small" style={{ padding: '7px 0', borderBottom: '1px solid var(--line)' }}>
                  <span className={i === new Date().getDay() ? '' : 'muted'} style={i === new Date().getDay() ? { fontWeight: 700 } : {}}>
                    {WEEKDAYS_SHORT[i]}
                  </span>
                  <span className={h.open ? '' : 'muted'}>
                    {h.open ? `${h.start} – ${h.end}${h.breakStart ? ` (pausa ${h.breakStart}–${h.breakEnd})` : ''}` : 'Fechado'}
                  </span>
                </div>
              ))}
            </div>
            <div className="divider" />
            <div className="col">
              <a className="btn btn-portal btn-block" href={`https://wa.me/${s.whatsapp}`} target="_blank" rel="noreferrer">
                <Icon name="phone" size={17} /> Falar no WhatsApp
              </a>
              <a className="btn btn-ghost btn-block" href={s.mapUrl} target="_blank" rel="noreferrer">
                <Icon name="pin" size={17} /> Como chegar
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
