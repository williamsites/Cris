import { useState } from 'react';
import { useDB } from '../data/store';
import { Badge, SmartImage } from '../components/ui';
import { Icon } from '../components/Icon';
import { brl } from '../lib/utils';
import { useToast } from '../components/Toast';

export default function ProductsPage() {
  const { db } = useDB();
  const toast = useToast();
  const [q, setQ] = useState('');
  const list = db.products
    .filter((p) => p.active)
    .filter((p) => (q ? (p.name + p.description).toLowerCase().includes(q.toLowerCase()) : true));

  const order = (p: typeof list[number]) =>
    toast(
      `Reserva de ${p.name} registrada! Retire e pague na barbearia. Fale no WhatsApp para confirmar.`,
      'ok'
    );

  return (
    <>
      <div className="banner" style={{ padding: 26, marginBottom: 26 }}>
        <span className="eyebrow"><Icon name="bag" size={13} /> Loja da barbearia</span>
        <h1 className="section-title mt-16">Produtos Cris Barber</h1>
        <p className="section-kicker" style={{ maxWidth: 620 }}>
          Pomadas, óleos, minoxidil e kits selecionados. Reserve pelo site e retire na Av. Feitoria, 2141.
        </p>
        <div className="flex mt-16" style={{ maxWidth: 420 }}>
          <input className="input" placeholder="Buscar produto..." value={q} onChange={(e) => setQ(e.target.value)} />
          <Icon name="search" />
        </div>
      </div>

      <div className="grid grid-4">
        {list.map((p) => {
          const price = p.promoPrice ?? p.price;
          return (
            <article key={p.id} className="card card-hover media-card">
              <div className="media-thumb" style={{ aspectRatio: '1 / 1' }}>
                <SmartImage src={p.image} alt={p.name} emoji={p.emoji} />
                <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 2, display: 'flex', gap: 6 }}>
                  {p.promoPrice && <Badge tone="ok">Oferta</Badge>}
                  {p.stock <= 0 ? (
                    <Badge tone="danger">Esgotado</Badge>
                  ) : p.minStock !== undefined && p.stock <= p.minStock ? (
                    <Badge tone="warn">Últimas {p.stock}</Badge>
                  ) : (
                    <Badge tone="ok">Em estoque</Badge>
                  )}
                </div>
              </div>
              <div className="media-body">
                <h3 className="card-title" style={{ fontSize: 15.5 }}>{p.name}</h3>
                <p className="card-muted small">{p.description}</p>
                <div className="media-foot">
                  <span className="price">
                    {brl(price)}
                    {p.promoPrice && <small style={{ textDecoration: 'line-through', marginLeft: 7 }}>{brl(p.price)}</small>}
                  </span>
                </div>
                <button className="btn btn-portal btn-block btn-sm" disabled={p.stock <= 0} onClick={() => order(p)}>
                  {p.stock <= 0 ? 'Sem estoque' : 'Reservar produto'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
