import { useState } from 'react';
import { useDB } from '../../data/store';
import { Icon } from '../../components/Icon';
import { Badge, ConfirmButton, Modal, SmartImage } from '../../components/ui';
import { ImagePicker } from '../../components/ImagePicker';
import { useToast } from '../../components/Toast';
import type { Service } from '../../data/types';
import { brl, formatDuration, uid } from '../../lib/utils';

const empty: Service = {
  id: '', name: '', description: '', price: 45, durationMin: 40, image: '', active: true, featured: false,
};

export default function AdminServices() {
  const { db, saveService, removeService } = useDB();
  const toast = useToast();
  const [editing, setEditing] = useState<Service | null>(null);

  const open = (s?: Service) => setEditing(s ? { ...s } : { ...empty, id: uid('svc') });

  return (
    <>
      <div className="section-head">
        <div>
          <span className="eyebrow"><Icon name="scissors" size={13} /> Catálogo</span>
          <h1 className="section-title mt-8">Serviços</h1>
          <p className="section-kicker">
            A duração de cada serviço define os horários disponíveis na agenda — mantenha os tempos corretos.
          </p>
        </div>
        <button className="btn btn-portal" onClick={() => open()}>
          <Icon name="plus" size={16} /> Novo serviço
        </button>
      </div>

      <div className="grid grid-3">
        {db.services.map((s) => (
          <article className="card media-card" key={s.id}>
            <div className="media-thumb">
              <SmartImage src={s.image} alt={s.name} />
              <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 2, display: 'flex', gap: 6 }}>
                <Badge tone={s.active ? 'ok' : 'danger'}>{s.active ? 'ativo' : 'oculto'}</Badge>
                {s.featured && <Badge tone="neon">destaque</Badge>}
              </div>
            </div>
            <div className="media-body">
              <h3 className="card-title">{s.name}</h3>
              <p className="card-muted small">{s.description}</p>
              <p className="small muted">{formatDuration(s.durationMin)} · {brl(s.price)}</p>
              <div className="media-foot">
                <button className="btn btn-sm" onClick={() => open(s)}>
                  <Icon name="edit" size={15} /> Editar
                </button>
                <ConfirmButton onConfirm={() => { removeService(s.id); toast('Serviço removido.', 'ok'); }}>
                  <Icon name="trash" size={15} />
                </ConfirmButton>
              </div>
            </div>
          </article>
        ))}
      </div>

      {editing && (
        <Modal open title={db.services.some((s) => s.id === editing.id) ? 'Editar serviço' : 'Novo serviço'} onClose={() => setEditing(null)}>
          <div className="field">
            <label>Nome do serviço *</label>
            <input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          </div>
          <div className="field">
            <label>Descrição</label>
            <textarea className="textarea" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          </div>
          <div className="row row-2">
            <div className="field">
              <label>Preço (R$)</label>
              <input className="input" type="number" min={0} step="0.01" value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} />
            </div>
            <div className="field">
              <label>Duração (minutos)</label>
              <input className="input" type="number" min={5} step={5} value={editing.durationMin} onChange={(e) => setEditing({ ...editing, durationMin: Number(e.target.value) })} />
            </div>
          </div>
          <ImagePicker
            label="Foto do serviço"
            value={editing.image}
            onChange={(v) => setEditing({ ...editing, image: v })}
            suggestions={db.settings.gallery.slice(0, 5)}
          />
          <div className="flex flex-wrap">
            <label className="switch">
              <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
              <span className="track" /> Visível no site
            </label>
            <label className="switch">
              <input type="checkbox" checked={editing.featured} onChange={(e) => setEditing({ ...editing, featured: e.target.checked })} />
              <span className="track" /> Mostrar em destaque na home
            </label>
          </div>
          <div className="divider" />
          <div className="flex">
            <button
              className="btn btn-portal"
              onClick={() => {
                if (editing.name.trim().length < 3) return toast('Informe o nome do serviço.', 'err');
                saveService(editing);
                setEditing(null);
                toast('Serviço salvo.', 'ok');
              }}
            >
              <Icon name="check" size={16} /> Salvar serviço
            </button>
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </>
  );
}
