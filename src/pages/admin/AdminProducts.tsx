import { useState } from 'react';
import { useDB } from '../../data/store';
import { Icon } from '../../components/Icon';
import { Badge, ConfirmButton, Modal, SmartImage } from '../../components/ui';
import { ImagePicker } from '../../components/ImagePicker';
import { useToast } from '../../components/Toast';
import type { Product } from '../../data/types';
import { brl, uid } from '../../lib/utils';

const EMOJIS = ['💈', '🧴', '🪒', '🧼', '💧', '✨', '🧪', '🎁', '🫙', '🪥'];

const empty: Product = {
  id: '', name: '', description: '', price: 49, stock: 0, minStock: 2, image: '', emoji: '🧴', active: true,
};

export default function AdminProducts() {
  const { db, saveProduct, removeProduct } = useDB();
  const toast = useToast();
  const [editing, setEditing] = useState<Product | null>(null);
  const [q, setQ] = useState('');

  const list = db.products.filter((p) => (q ? p.name.toLowerCase().includes(q.toLowerCase()) : true));
  const stockValue = db.products.reduce((acc, p) => acc + p.stock * (p.promoPrice ?? p.price), 0);

  return (
    <>
      <div className="section-head">
        <div>
          <span className="eyebrow"><Icon name="bag" size={13} /> Loja</span>
          <h1 className="section-title mt-8">Produtos e estoque</h1>
          <p className="section-kicker">
            Valor total em estoque: <strong>{brl(stockValue)}</strong> · {db.products.length} produtos cadastrados
          </p>
        </div>
        <button className="btn btn-portal" onClick={() => setEditing({ ...empty, id: uid('prd') })}>
          <Icon name="plus" size={16} /> Novo produto
        </button>
      </div>

      <div className="card">
        <input className="input" placeholder="Buscar produto..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="table-wrap mt-16">
        <table>
          <thead>
            <tr>
              <th>Produto</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th>Situação</th><th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="flex">
                    <SmartImage src={p.image} alt={p.name} className="avatar avatar-sm" emoji={p.emoji} />
                    <div>
                      <strong>{p.name}</strong>
                      <div className="small muted truncate" style={{ maxWidth: 260 }}>{p.description}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <Badge>produto</Badge>
                </td>
                <td className="mono">
                  {brl(p.promoPrice ?? p.price)}
                  {p.promoPrice && <div className="small muted" style={{ textDecoration: 'line-through' }}>{brl(p.price)}</div>}
                </td>
                <td>
                  <div className="flex">
                    <button className="btn btn-sm btn-icon" onClick={() => saveProduct({ ...p, stock: Math.max(0, p.stock - 1) })}>–</button>
                    <strong className="mono" style={{ minWidth: 28, textAlign: 'center' }}>{p.stock}</strong>
                    <button className="btn btn-sm btn-icon" onClick={() => saveProduct({ ...p, stock: p.stock + 1 })}>+</button>
                  </div>
                </td>
                <td>
                  {p.stock <= 0 ? <Badge tone="danger">esgotado</Badge>
                    : p.stock <= (p.minStock ?? 0) ? <Badge tone="warn">estoque baixo</Badge>
                    : <Badge tone="ok">disponível</Badge>}
                  {!p.active && <Badge tone="danger">oculto</Badge>}
                </td>
                <td>
                  <div className="flex">
                    <button className="btn btn-sm" onClick={() => setEditing({ ...p })}>
                      <Icon name="edit" size={15} />
                    </button>
                    <ConfirmButton onConfirm={() => { removeProduct(p.id); toast('Produto removido.', 'ok'); }}>
                      <Icon name="trash" size={15} />
                    </ConfirmButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal open title={db.products.some((p) => p.id === editing.id) ? 'Editar produto' : 'Novo produto'} onClose={() => setEditing(null)}>
          <div className="row row-2">
            <div className="field">
              <label>Nome *</label>
              <input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </div>
            <div className="field">
              <label>Ícone (quando não houver foto)</label>
              <div className="flex flex-wrap">
                {EMOJIS.map((em) => (
                  <button
                    key={em}
                    className="btn btn-sm"
                    style={{ borderColor: editing.emoji === em ? 'var(--neon-2)' : undefined, background: editing.emoji === em ? 'var(--neon-soft)' : undefined }}
                    onClick={() => setEditing({ ...editing, emoji: em })}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="field">
            <label>Descrição</label>
            <textarea className="textarea" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          </div>
          <div className="row row-3">
            <div className="field">
              <label>Preço (R$)</label>
              <input className="input" type="number" step="0.01" value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} />
            </div>
            <div className="field">
              <label>Preço promocional</label>
              <input
                className="input" type="number" step="0.01"
                value={editing.promoPrice ?? ''}
                onChange={(e) => setEditing({ ...editing, promoPrice: e.target.value === '' ? undefined : Number(e.target.value) })}
              />
            </div>
            <div className="field">
              <label>Estoque / mínimo</label>
              <div className="flex">
                <input className="input" type="number" value={editing.stock} onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })} />
                <input className="input" type="number" value={editing.minStock ?? 0} onChange={(e) => setEditing({ ...editing, minStock: Number(e.target.value) })} />
              </div>
            </div>
          </div>
          <ImagePicker
            label="Foto do produto"
            value={editing.image}
            onChange={(v) => setEditing({ ...editing, image: v })}
            suggestions={db.settings.gallery.slice(0, 4)}
            aspect="1 / 1"
          />
          <label className="switch">
            <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
            <span className="track" /> Visível na loja
          </label>
          <div className="divider" />
          <div className="flex">
            <button
              className="btn btn-portal"
              onClick={() => {
                if (editing.name.trim().length < 2) return toast('Informe o nome do produto.', 'err');
                saveProduct(editing);
                setEditing(null);
                toast('Produto salvo.', 'ok');
              }}
            >
              <Icon name="check" size={16} /> Salvar produto
            </button>
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </>
  );
}
