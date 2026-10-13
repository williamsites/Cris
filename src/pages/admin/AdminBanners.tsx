import { useState } from 'react';
import { useDB } from '../../data/store';
import { Icon } from '../../components/Icon';
import { Badge, ConfirmButton, Modal } from '../../components/ui';
import { ImagePicker } from '../../components/ImagePicker';
import { useToast } from '../../components/Toast';
import type { Banner } from '../../data/types';
import { uid } from '../../lib/utils';

const empty: Banner = { id: '', title: '', text: '', image: '', ctaLabel: 'Agendar', ctaUrl: '/agendar', active: true };

export default function AdminBanners() {
  const { db, saveBanner, removeBanner, saveSettings } = useDB();
  const toast = useToast();
  const [editing, setEditing] = useState<Banner | null>(null);
  const [highlight, setHighlight] = useState<number | null>(null);

  const highlights = db.settings.highlights;

  return (
    <>
      <div className="section-head">
        <div>
          <span className="eyebrow"><Icon name="image" size={13} /> Vitrine</span>
          <h1 className="section-title mt-8">Banners, fotos e quadros</h1>
          <p className="section-kicker">Tudo o que aparece na home: banners de promoção, galeria de fotos e os quadros de destaque</p>
        </div>
        <button className="btn btn-portal" onClick={() => setEditing({ ...empty, id: uid('bnr') })}>
          <Icon name="plus" size={16} /> Novo banner
        </button>
      </div>

      <h2 className="section-title" style={{ fontSize: 18 }}>Banners</h2>
      <div className="grid grid-3 mt-16">
        {db.banners.map((b) => (
          <article className="card media-card" key={b.id}>
            <div className="media-thumb">
              <img src={b.image} alt={b.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 2 }}>
                <Badge tone={b.active ? 'ok' : 'danger'}>{b.active ? 'publicado' : 'oculto'}</Badge>
              </div>
            </div>
            <div className="media-body">
              <h3 className="card-title">{b.title}</h3>
              <p className="card-muted small">{b.text}</p>
              <div className="media-foot">
                <button className="btn btn-sm" onClick={() => setEditing({ ...b })}>
                  <Icon name="edit" size={15} /> Editar
                </button>
                <button className="btn btn-sm" onClick={() => saveBanner({ ...b, active: !b.active })}>
                  {b.active ? 'Ocultar' : 'Publicar'}
                </button>
                <ConfirmButton onConfirm={() => { removeBanner(b.id); toast('Banner removido.', 'ok'); }}>
                  <Icon name="trash" size={15} />
                </ConfirmButton>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="divider" />

      <div className="flex-between flex-wrap">
        <div>
          <h2 className="section-title" style={{ fontSize: 18 }}>Quadros de destaque</h2>
          <p className="section-kicker">Os 4 cards com ícone, título e texto logo abaixo do banner principal</p>
        </div>
      </div>
      <div className="grid grid-4 mt-16">
        {highlights.map((h, i) => (
          <button className="card card-tight" key={i} style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => setHighlight(i)}>
            <div style={{ fontSize: 24 }}>{h.icon}</div>
            <h3 className="card-title mt-8" style={{ fontSize: 15 }}>{h.title}</h3>
            <p className="card-muted small">{h.text}</p>
          </button>
        ))}
      </div>

      <div className="mt-16">
        <button
          className="btn btn-sm"
          onClick={() => {
            saveSettings({
              highlights: [
                ...highlights,
                { icon: '✨', title: 'Novo quadro', text: 'Descreva este destaque da barbearia.' },
              ],
            });
            setHighlight(highlights.length);
          }}
        >
          <Icon name="plus" size={15} /> Adicionar quadro
        </button>
      </div>

      <div className="divider" />

      <h2 className="section-title" style={{ fontSize: 18 }}>Galeria de fotos</h2>
      <p className="section-kicker">Fotos reais da barbearia — use o Instagram {db.settings.instagramHandle} como referência</p>
      <div className="gallery mt-16">
        {db.settings.gallery.map((g, i) => (
          <div className="gallery-item" key={i} style={{ position: 'relative' }}>
            <img src={g} alt={`Foto ${i + 1}`} />
            <button
              className="btn btn-danger btn-icon btn-sm"
              style={{ position: 'absolute', top: 8, right: 8 }}
              onClick={() => saveSettings({ gallery: db.settings.gallery.filter((_, idx) => idx !== i) })}
              aria-label="Remover foto"
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-16" style={{ maxWidth: 520 }}>
        <ImagePicker
          label="Adicionar foto à galeria (upload do celular ou URL)"
          value=""
          onChange={(v) => {
            if (!v) return;
            saveSettings({ gallery: [...db.settings.gallery, v] });
            toast('Foto adicionada à galeria.', 'ok');
          }}
        />
      </div>

      {editing && (
        <Modal open title={db.banners.some((b) => b.id === editing.id) ? 'Editar banner' : 'Novo banner'} onClose={() => setEditing(null)}>
          <div className="field">
            <label>Título *</label>
            <input className="input" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
          </div>
          <div className="field">
            <label>Texto</label>
            <textarea className="textarea" value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} />
          </div>
          <div className="row row-2">
            <div className="field">
              <label>Texto do botão</label>
              <input className="input" value={editing.ctaLabel || ''} onChange={(e) => setEditing({ ...editing, ctaLabel: e.target.value })} />
            </div>
            <div className="field">
              <label>Link do botão</label>
              <input className="input" value={editing.ctaUrl || ''} onChange={(e) => setEditing({ ...editing, ctaUrl: e.target.value })} placeholder="/agendar" />
            </div>
          </div>
          <ImagePicker label="Imagem do banner" value={editing.image} onChange={(v) => setEditing({ ...editing, image: v })} suggestions={db.settings.gallery.slice(0, 5)} />
          <label className="switch">
            <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
            <span className="track" /> Publicar na home
          </label>
          <div className="divider" />
          <div className="flex">
            <button
              className="btn btn-portal"
              onClick={() => {
                if (editing.title.trim().length < 3) return toast('Informe o título do banner.', 'err');
                saveBanner(editing);
                setEditing(null);
                toast('Banner salvo.', 'ok');
              }}
            >
              <Icon name="check" size={16} /> Salvar banner
            </button>
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancelar</button>
          </div>
        </Modal>
      )}

      {highlight !== null && (
        <Modal open title="Editar quadro de destaque" onClose={() => setHighlight(null)}>
          <div className="field">
            <label>Ícone (emoji)</label>
            <input
              className="input"
              value={highlights[highlight].icon}
              onChange={(e) => {
                const copy = [...highlights];
                copy[highlight] = { ...copy[highlight], icon: e.target.value };
                saveSettings({ highlights: copy });
              }}
            />
          </div>
          <div className="field">
            <label>Título</label>
            <input
              className="input"
              value={highlights[highlight].title}
              onChange={(e) => {
                const copy = [...highlights];
                copy[highlight] = { ...copy[highlight], title: e.target.value };
                saveSettings({ highlights: copy });
              }}
            />
          </div>
          <div className="field">
            <label>Texto</label>
            <textarea
              className="textarea"
              value={highlights[highlight].text}
              onChange={(e) => {
                const copy = [...highlights];
                copy[highlight] = { ...copy[highlight], text: e.target.value };
                saveSettings({ highlights: copy });
              }}
            />
          </div>
          <div className="flex">
            <button className="btn btn-portal" onClick={() => { setHighlight(null); toast('Quadro atualizado.', 'ok'); }}>
              <Icon name="check" size={16} /> Concluir
            </button>
            <ConfirmButton
              onConfirm={() => {
                if (highlights.length <= 1) return;
                saveSettings({ highlights: highlights.filter((_, i) => i !== highlight) });
                setHighlight(null);
              }}
              className="btn btn-danger"
            >
              <Icon name="trash" size={15} /> Remover quadro
            </ConfirmButton>
          </div>
        </Modal>
      )}
    </>
  );
}
