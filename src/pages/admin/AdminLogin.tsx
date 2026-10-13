import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDB } from '../../data/store';
import { Icon } from '../../components/Icon';
import { useToast } from '../../components/Toast';

export default function AdminLogin() {
  const { login, isAdmin, db } = useDB();
  const toast = useToast();
  const nav = useNavigate();
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    if (isAdmin) nav('/adm/painel', { replace: true });
  }, [isAdmin, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = await login(user, password);
    setBusy(false);
    if (ok) {
      toast('Bem-vindo ao painel administrativo 💈', 'ok');
      nav('/adm/painel');
    } else {
      toast('Usuário ou senha inválidos.', 'err');
    }
  };

  return (
    <div style={{ maxWidth: 440, margin: '30px auto 0' }}>
      <div className="card card-glow">
        <div className="col" style={{ alignItems: 'center', textAlign: 'center' }}>
          <span className="brand-mark" style={{ width: 56, height: 56, borderRadius: 18 }}>
            <Icon name="lock" size={24} />
          </span>
          <h1 className="section-title" style={{ fontSize: 24 }}>Painel ADM</h1>
          <p className="small muted">Área restrita da {db.settings.shopName}. Controle total do SaaS.</p>
        </div>
        <form onSubmit={submit} className="mt-16">
          <div className="field">
            <label>Usuário</label>
            <input className="input" value={user} onChange={(e) => setUser(e.target.value)} placeholder="admin" autoComplete="username" />
          </div>
          <div className="field">
            <label>Senha</label>
            <div className="flex">
              <input
                className="input" type={show ? 'text' : 'password'} value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="••••••" autoComplete="current-password"
              />
              <button type="button" className="btn btn-icon" onClick={() => setShow((v) => !v)} aria-label="Mostrar senha">
                <Icon name={show ? 'x' : 'shield'} size={17} />
              </button>
            </div>
          </div>
          <button className="btn btn-portal btn-lg btn-block" disabled={busy}>
            {busy ? 'Entrando...' : 'Entrar no painel'}
          </button>
        </form>
        <div className="notice mt-16">
          <strong>Acesso padrão:</strong> usuário <code>admin</code> · senha <code>will123</code>.
          <br />
          Troque a senha em <em>Configurações → Segurança</em> após o primeiro acesso.
        </div>
      </div>
      <p className="small muted mt-16" style={{ textAlign: 'center' }}>
        A senha é armazenada como hash SHA-256 no banco local do SaaS — ninguém consegue lê-la, só trocá-la.
      </p>
    </div>
  );
}
