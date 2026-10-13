import { useState } from 'react';
import { useDB } from '../../data/store';
import { Icon } from '../../components/Icon';
import { Badge, ConfirmButton, Modal, SmartImage } from '../../components/ui';
import { ImagePicker } from '../../components/ImagePicker';
import { useToast } from '../../components/Toast';
import type { Professional } from '../../data/types';
import { uid, WEEKDAYS_SHORT } from '../../lib/utils';

const empty: Professional = {
  id: '', name: '', role: 'Barbeiro', bio: '', photo: '', serviceIds: [], workdays: [2, 3, 4, 5, 6],
  start: '09:00', end: '20:00', active: true, rating: 5,
};

export default function AdminProfessionals() {
  const { db, saveProfessional, removeProfessional } = useDB();
  const toast = useToast();
  const [editing, setEditing] = useState<Professional | null>(null);

  return (
    <>
      <div className="section-head">
        <div>
          <span className="eyebrow"><Icon name="users" size={13} /> Equipe</span>
          <h1 className="section-title mt-8">Profissionais</h1>
          <p className="section-kicker">
            Cada barbeiro tem escala, serviços e agenda próprios — o sistema respeita tudo isso ao liberar horários.
          </p>
        </div>
        <button className="btn btn-portal" onClick={() => setEditing({ ...empty, id: uid('pro') })}>
          <Icon name="plus" size={16} /> Novo profissional
        </button>
      </div>

      <div className="grid grid-2">
        {db.professionals.map((p) => {
          const services = p.serviceIds.length ? db.services.filter((s) => p.serviceIds.includes(s.id)) : db.services;
          const appts = db.appointments.filter((a) => a.professionalId === p.id && a.status !== 'cancelado').length;
          return (
            <article className="card" key={p.id}>
              <div className="flex" style={{ alignItems: 'flex-start' }}>
                <SmartImage src={p.photo} alt={p.name} className="avatar" emoji="🧑‍🔧" style={{ width: 66, height: 66, borderRadius: 18 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex-between flex-wrap">
                    <h3 style={{ fontSize: 17 }}>{p.name}</h3>
                    <Badge tone={p.active ? 'ok' : 'danger'}>{p.active ? 'ativo' : 'inativo'}</Badge>
                  </div>
                  <p className="small muted">{p.role}</p>
                  <p className="card-muted small mt-8">{p.bio}</p>
                </div>
              </div>
              <div className="divider" />
              <div className="small muted">
                {p.workdays.map((w) => WEEKDAYS_SHORT[w]).join(' · ')} · {p.start}–{p.end} · {appts} atendimentos
              </div>
              <div className="flex flex-wrap mt-8">
                {services.slice(0, 4).map((s) => (
                  <Badge key={s.id}>{s.name}</Badge>
                ))}
                {services.length > 4 && <Badge>+{services.length - 4}</Badge>}
                {p.serviceIds.length === 0 && <Badge tone="neon">todos os serviços</Badge>}
              </div>
              <div className="flex mt-16">
                <button className="btn btn-sm" onClick={() => setEditing({ ...p })}>
                  <Icon name="edit" size={15} /> Editar
                </button>
                <button className="btn btn-sm" onClick={() => { saveProfessional({ ...p, active: !p.active }); toast(p.active ? 'Profissional ocultado.' : 'Profissional ativado.', 'ok'); }}>
                  <Icon name={p.active ? 'x' : 'check'} size={15} /> {p.active ? 'Desativar' : 'Ativar'}
                </button>
                <ConfirmButton onConfirm={() => { removeProfessional(p.id); toast('Profissional removido.', 'ok'); }}>
                  <Icon name="trash" size={15} />
                </ConfirmButton>
              </div>
            </article>
          );
        })}
      </div>

      {editing && (
        <Modal open title={db.professionals.some((p) => p.id === editing.id) ? 'Editar profissional' : 'Novo profissional'} onClose={() => setEditing(null)}>
          <div className="row row-2">
            <div className="field">
              <label>Nome *</label>
              <input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </div>
            <div className="field">
              <label>Cargo</label>
              <input className="input" value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })} placeholder="Ex.: Master Barber" />
            </div>
          </div>
          <div className="field">
            <label>Apresentação</label>
            <textarea className="textarea" value={editing.bio} onChange={(e) => setEditing({ ...editing, bio: e.target.value })} />
          </div>
          <ImagePicker label="Foto do profissional" value={editing.photo} onChange={(v) => setEditing({ ...editing, photo: v })} round suggestions={db.settings.gallery.slice(0, 4)} />

          <div className="row row-3">
            <div className="field">
              <label>Entra às</label>
              <input className="input" type="time" value={editing.start} onChange={(e) => setEditing({ ...editing, start: e.target.value })} />
            </div>
            <div className="field">
              <label>Sai às</label>
              <input className="input" type="time" value={editing.end} onChange={(e) => setEditing({ ...editing, end: e.target.value })} />
            </div>
            <div className="field">
              <label>Avaliação (0–5)</label>
              <input className="input" type="number" min={0} max={5} step="0.1" value={editing.rating} onChange={(e) => setEditing({ ...editing, rating: Number(e.target.value) })} />
            </div>
          </div>

          <div className="field">
            <label>Dias de trabalho</label>
            <div className="flex flex-wrap">
              {WEEKDAYS_SHORT.map((d, i) => {
                const on = editing.workdays.includes(i);
                return (
                  <button
                    key={d}
                    className="btn btn-sm"
                    style={{ borderColor: on ? 'var(--neon-2)' : undefined, background: on ? 'var(--neon-soft)' : undefined }}
                    onClick={() =>
                      setEditing({
                        ...editing,
                        workdays: on ? editing.workdays.filter((x) => x !== i) : [...editing.workdays, i].sort(),
                      })
                    }
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="field">
            <label>Serviços que atende</label>
            <p className="small muted">Sem seleção = atende todos os serviços da barbearia.</p>
            <div className="flex flex-wrap mt-8">
              {db.services.map((s) => {
                const on = editing.serviceIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    className="btn btn-sm"
                    style={{ borderColor: on ? 'var(--neon-2)' : undefined, background: on ? 'var(--neon-soft)' : undefined }}
                    onClick={() =>
                      setEditing({
                        ...editing,
                        serviceIds: on ? editing.serviceIds.filter((x) => x !== s.id) : [...editing.serviceIds, s.id],
                      })
                    }
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="switch">
            <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
            <span className="track" /> Recebendo agendamentos
          </label>

          <div className="divider" />
          <div className="flex">
            <button
              className="btn btn-portal"
              onClick={() => {
                if (editing.name.trim().length < 3) return toast('Informe o nome do profissional.', 'err');
                if (editing.workdays.length === 0) return toast('Selecione ao menos um dia de trabalho.', 'err');
                saveProfessional(editing);
                setEditing(null);
                toast('Profissional salvo.', 'ok');
              }}
            >
              <Icon name="check" size={16} /> Salvar
            </button>
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </>
  );
}
