import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDB } from '../data/store';
import { Badge, SmartImage } from '../components/ui';
import { Icon } from '../components/Icon';
import { brl, formatDuration } from '../lib/utils';

export default function ServicesPage() {
  const { db } = useDB();
  const [q, setQ] = useState('');
  const list = db.services
    .filter((s) => s.active)
    .filter((s) => (q ? (s.name + s.description).toLowerCase().includes(q.toLowerCase()) : true));

  return (
    <>
      <div className="banner" style={{ padding: 26, marginBottom: 26 }}>
        <span className="eyebrow"><Icon name="scissors" size={13} /> Menu completo</span>
        <h1 className="section-title mt-16">Serviços e preços</h1>
        <p className="section-kicker" style={{ maxWidth: 620 }}>
          Cada serviço tem uma duração real — é ela que define quantos horários ficam disponíveis na agenda do seu barbeiro.
        </p>
        <div className="flex mt-16" style={{ maxWidth: 420 }}>
          <input className="input" placeholder="Buscar serviço..." value={q} onChange={(e) => setQ(e.target.value)} />
          <Icon name="search" />
        </div>
      </div>

      <div className="grid grid-3">
        {list.map((s) => (
          <article key={s.id} className="card card-hover media-card">
            <div className="media-thumb">
              <SmartImage src={s.image} alt={s.name} />
              <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 2, display: 'flex', gap: 6 }}>
                <Badge tone="neon">{formatDuration(s.durationMin)}</Badge>
                {s.featured && <Badge>Destaque</Badge>}
              </div>
            </div>
            <div className="media-body">
              <h3 className="card-title">{s.name}</h3>
              <p className="card-muted">{s.description}</p>
              <div className="media-foot">
                <span className="price">{brl(s.price)}</span>
                <Link className="btn btn-portal btn-sm" to={`/agendar?servico=${s.id}`}>
                  <Icon name="calendar" size={15} /> Agendar
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>

      {list.length === 0 && (
        <div className="empty">
          <div className="empty-icon">🔍</div>
          <h3>Nenhum serviço encontrado</h3>
        </div>
      )}
    </>
  );
}
