import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Icon } from './Icon';
import { useDB } from '../data/store';

const NAV = [
  { to: '/', label: 'Início', icon: 'home' as const },
  { to: '/servicos', label: 'Serviços', icon: 'scissors' as const },
  { to: '/agendar', label: 'Agendar', icon: 'calendar' as const },
  { to: '/produtos', label: 'Loja', icon: 'bag' as const },
  { to: '/meus-agendamentos', label: 'Meus', icon: 'clock' as const },
];

export function Layout({ admin = false }: { admin?: boolean }) {
  const { db, isAdmin, mode, syncing } = useDB();
  const s = db.settings;
  const { pathname } = useLocation();

  return (
    <div className={`app ${admin ? 'with-bottom-nav' : 'with-bottom-nav'}`}>
      <header className="header">
        <div className="container header-inner">
          <Link to="/" className="brand" aria-label={s.shopName}>
            {s.logoUrl ? (
              <img className="brand-logo" src={s.logoUrl} alt={s.shopName} />
            ) : (
              <span className="brand-mark">CB</span>
            )}
            <span>
              <span className="brand-name">{s.shopName}</span>
              <span className="brand-sub">{s.city || 'Barbearia'}</span>
            </span>
          </Link>

          <nav className="header-nav">
            {NAV.slice(0, 4).map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => (isActive ? 'active' : '')} end={n.to === '/'}>
                {n.label}
              </NavLink>
            ))}
            <NavLink to="/contato" className={({ isActive }) => (isActive ? 'active' : '')}>
              Contato
            </NavLink>
            <NavLink to="/adm" className={({ isActive }) => (isActive ? 'active' : '')}>
              {isAdmin ? 'Painel ADM' : 'ADM'}
            </NavLink>
          </nav>

          <div className="header-actions">
            <a
              className="btn btn-ghost btn-sm"
              href={`https://wa.me/${s.whatsapp}?text=${encodeURIComponent('Olá! Quero agendar um horário na Cris Barber.')}`}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="phone" size={16} /> <span className="hide-xs">WhatsApp</span>
            </a>
            <Link className="btn btn-portal btn-sm" to="/agendar">
              <Icon name="calendar" size={16} /> Agendar
            </Link>
          </div>
        </div>
      </header>

      <main className={admin ? 'page page-admin' : 'page'}>
        <div className="container">
          <Outlet />
        </div>
      </main>

      <footer className="footer">
        <div className="container flex-between flex-wrap" style={{ marginBottom: 14 }}>
          <span className={`badge ${mode === 'remote' ? 'badge-ok' : 'badge-warn'}`}>
            <Icon name={mode === 'remote' ? 'check' : 'clock'} size={12} />
            {mode === 'remote'
              ? syncing
                ? 'agenda compartilhada · sincronizando'
                : 'agenda compartilhada online'
              : 'modo local (dados neste dispositivo)'}
          </span>
          {import.meta.env.DEV && (
            <a className="btn btn-sm" href="/download/cris-barber-saas-completo.zip" download>
              <Icon name="download" size={15} /> Baixar pacote do projeto (.zip)
            </a>
          )}
        </div>
        <div className="container flex-between flex-wrap">
          <div>
            <strong style={{ color: '#fff' }}>{s.shopName}</strong> · {s.address} — {s.city}
            <div className="small mt-8">
              {s.tagline} ·{' '}
              <a href={s.instagram} target="_blank" rel="noreferrer">
                {s.instagramHandle}
              </a>
            </div>
          </div>
          <div className="small">
            {isAdmin ? <Link to="/adm/painel">Painel ADM</Link> : <Link to="/adm">Acesso ADM</Link>} · PWA instalável ·
            dados salvos no dispositivo
          </div>
        </div>
      </footer>

      <nav className="bottom-nav" aria-label="Navegação principal">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="nav-ico">
              <Icon name={n.icon} size={18} />
            </span>
            {n.label}
          </NavLink>
        ))}
      </nav>

      {pathname !== '/agendar' && (
        <Link to="/agendar" className="btn btn-portal nav-fab pulse" style={{ padding: '14px 18px' }}>
          <Icon name="plus" size={17} /> Reservar
        </Link>
      )}
    </div>
  );
}
