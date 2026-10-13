import { useState, useRef } from 'react';
import { useDB } from '../../data/store';
import { Icon } from '../../components/Icon';
import { ConfirmButton, Field, Modal } from '../../components/ui';
import { ImagePicker } from '../../components/ImagePicker';
import { useToast } from '../../components/Toast';
import { WEEKDAYS } from '../../lib/utils';

export default function AdminSettings() {
  const { db, saveSettings, changePassword, exportDB, importDB, resetDemo } = useDB();
  const toast = useToast();
  const s = db.settings;
  const fileRef = useRef<HTMLInputElement>(null);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  const download = () => {
    const blob = new Blob([exportDB()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cris-barber-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const upload = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = importDB(String(reader.result));
      toast(res.ok ? 'Backup restaurado com sucesso!' : res.error || 'Falha ao importar.', res.ok ? 'ok' : 'err');
    };
    reader.readAsText(file);
  };

  return (
    <>
      <div className="section-head">
        <div>
          <span className="eyebrow"><Icon name="settings" size={13} /> Administração</span>
          <h1 className="section-title mt-8">Configurações do SaaS</h1>
          <p className="section-kicker">Identidade, endereço, horários, regras de agendamento, segurança e backup</p>
        </div>
      </div>

      <div className="row row-2" style={{ alignItems: 'start' }}>
        <div className="col">
          <div className="card">
            <h3 className="card-title">Identidade da barbearia</h3>
            <div className="divider" />
            <Field label="Nome da barbearia">
              <input className="input" value={s.shopName} onChange={(e) => saveSettings({ shopName: e.target.value })} />
            </Field>
            <Field label="Slogan / subtítulo">
              <input className="input" value={s.tagline} onChange={(e) => saveSettings({ tagline: e.target.value })} />
            </Field>
            <Field label="Sobre a barbearia">
              <textarea className="textarea" value={s.about} onChange={(e) => saveSettings({ about: e.target.value })} />
            </Field>
            <ImagePicker label="Logomarca" value={s.logoUrl} onChange={(v) => saveSettings({ logoUrl: v })} round />
            <ImagePicker
              label="Banner principal (capa da home)"
              value={s.coverUrl}
              onChange={(v) => saveSettings({ coverUrl: v })}
              suggestions={s.gallery.slice(0, 5)}
            />
          </div>

          <div className="card">
            <h3 className="card-title">Contato e endereço</h3>
            <div className="divider" />
            <div className="row row-2">
              <Field label="Endereço">
                <input className="input" value={s.address} onChange={(e) => saveSettings({ address: e.target.value })} />
              </Field>
              <Field label="Cidade / UF">
                <input className="input" value={s.city} onChange={(e) => saveSettings({ city: e.target.value })} />
              </Field>
              <Field label="Telefone exibido">
                <input className="input" value={s.phone} onChange={(e) => saveSettings({ phone: e.target.value })} />
              </Field>
              <Field label="WhatsApp (só números com 55)" hint="Ex.: 5551998000000">
                <input className="input" value={s.whatsapp} onChange={(e) => saveSettings({ whatsapp: e.target.value.replace(/\D/g, '') })} />
              </Field>
              <Field label="Instagram (link)">
                <input className="input" value={s.instagram} onChange={(e) => saveSettings({ instagram: e.target.value })} />
              </Field>
              <Field label="Instagram (exibição)">
                <input className="input" value={s.instagramHandle} onChange={(e) => saveSettings({ instagramHandle: e.target.value })} />
              </Field>
            </div>
            <Field label="Link do mapa (Google Maps)">
              <input className="input" value={s.mapUrl} onChange={(e) => saveSettings({ mapUrl: e.target.value })} />
            </Field>
          </div>
        </div>

        <div className="col">
          <div className="card">
            <h3 className="card-title">Horário de funcionamento</h3>
            <p className="small muted mt-8">Marque os dias abertos, o horário e o intervalo (almoço).</p>
            <div className="col mt-16">
              {s.hours.map((h, i) => (
                <div key={i} className="list-row" style={{ alignItems: 'flex-start' }}>
                  <label className="switch" style={{ minWidth: 96 }}>
                    <input
                      type="checkbox"
                      checked={h.open}
                      onChange={(e) => {
                        const copy = [...s.hours];
                        copy[i] = { ...h, open: e.target.checked };
                        saveSettings({ hours: copy });
                      }}
                    />
                    <span className="track" /> <span className="small">{WEEKDAYS[i].slice(0, 3)}</span>
                  </label>
                  <div className="flex" style={{ flex: 1, flexWrap: 'wrap' }}>
                    <input
                      className="input" type="time" style={{ maxWidth: 118 }} value={h.start} disabled={!h.open}
                      onChange={(e) => { const c = [...s.hours]; c[i] = { ...h, start: e.target.value }; saveSettings({ hours: c }); }}
                    />
                    <input
                      className="input" type="time" style={{ maxWidth: 118 }} value={h.end} disabled={!h.open}
                      onChange={(e) => { const c = [...s.hours]; c[i] = { ...h, end: e.target.value }; saveSettings({ hours: c }); }}
                    />
                    <input
                      className="input" type="time" style={{ maxWidth: 118 }} value={h.breakStart || ''} disabled={!h.open}
                      placeholder="pausa" title="Início da pausa"
                      onChange={(e) => { const c = [...s.hours]; c[i] = { ...h, breakStart: e.target.value }; saveSettings({ hours: c }); }}
                    />
                    <input
                      className="input" type="time" style={{ maxWidth: 118 }} value={h.breakEnd || ''} disabled={!h.open}
                      placeholder="fim" title="Fim da pausa"
                      onChange={(e) => { const c = [...s.hours]; c[i] = { ...h, breakEnd: e.target.value }; saveSettings({ hours: c }); }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">Regras do agendamento inteligente</h3>
            <div className="divider" />
            <Field label="Intervalo entre horários (minutos)" hint="Passo da grade de horários exibida ao cliente">
              <input className="input" type="number" min={5} step={5} value={s.slotMinutes} onChange={(e) => saveSettings({ slotMinutes: Number(e.target.value) })} />
            </Field>
            <Field label="Antecedência mínima (minutos)" hint="Bloqueia horários muito próximos do agora">
              <input className="input" type="number" min={0} step={15} value={s.minLeadMinutes} onChange={(e) => saveSettings({ minLeadMinutes: Number(e.target.value) })} />
            </Field>
            <Field label="Dias exibidos no calendário" hint="Quantos dias para frente o cliente pode agendar">
              <input className="input" type="number" min={3} max={90} value={s.daysAhead} onChange={(e) => saveSettings({ daysAhead: Number(e.target.value) })} />
            </Field>
          </div>

          <div className="card">
            <div className="flex-between">
              <h3 className="card-title">Segurança do ADM</h3>
              <Icon name="shield" />
            </div>
            <div className="divider" />
            <p className="small muted">
              Usuário atual: <strong style={{ color: '#fff' }}>{s.adminUser}</strong> · senha protegida por hash SHA-256
              (senha padrão inicial: <code>will123</code>).
            </p>
            <div className="field mt-16">
              <label>Nome de usuário do ADM</label>
              <input className="input" value={s.adminUser} onChange={(e) => saveSettings({ adminUser: e.target.value })} />
            </div>
            <button className="btn btn-portal" onClick={() => setPwdOpen(true)}>
              <Icon name="lock" size={16} /> Trocar senha do ADM
            </button>
          </div>

          <div className="card">
            <h3 className="card-title">Dados e backup</h3>
            <p className="small muted mt-8">
              Todo o SaaS roda com dados salvos no próprio dispositivo (funciona offline e é instalável). Faça backup
              regularmente e restaure em outro aparelho.
            </p>
            <div className="divider" />
            <div className="col">
              <button className="btn btn-portal btn-block" onClick={download}>
                <Icon name="download" size={16} /> Baixar backup completo (.json)
              </button>
              <button className="btn btn-block" onClick={() => fileRef.current?.click()}>
                <Icon name="upload" size={16} /> Restaurar backup
              </button>
              <ConfirmButton
                className="btn btn-danger btn-block"
                confirmLabel="Apagar tudo e recomeçar?"
                onConfirm={() => {
                  resetDemo();
                  toast('Base restaurada para os dados de exemplo.', 'ok');
                }}
              >
                <Icon name="trash" size={16} /> Restaurar dados de exemplo
              </ConfirmButton>
            </div>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => upload(e.target.files?.[0])} />
          </div>
        </div>
      </div>

      {pwdOpen && (
        <Modal open title="Trocar senha do ADM" subtitle="A nova senha passa a valer imediatamente para o painel" onClose={() => setPwdOpen(false)}>
          <Field label="Senha atual">
            <input className="input" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </Field>
          <Field label="Nova senha" hint="Mínimo de 6 caracteres">
            <input className="input" type="password" value={next} onChange={(e) => setNext(e.target.value)} />
          </Field>
          <Field label="Confirmar nova senha">
            <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          <div className="flex">
            <button
              className="btn btn-portal"
              onClick={async () => {
                if (next.length < 6) return toast('A nova senha precisa ter ao menos 6 caracteres.', 'err');
                if (next !== confirm) return toast('As senhas não conferem.', 'err');
                const ok = await changePassword(current, next);
                if (!ok) return toast('Senha atual incorreta.', 'err');
                toast('Senha alterada com sucesso!', 'ok');
                setPwdOpen(false);
                setCurrent(''); setNext(''); setConfirm('');
              }}
            >
              <Icon name="check" size={16} /> Salvar nova senha
            </button>
            <button className="btn btn-ghost" onClick={() => setPwdOpen(false)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </>
  );
}
