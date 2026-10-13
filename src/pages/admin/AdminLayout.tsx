import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import type { IconName } from '../../components/Icon';
import { useDB } from '../../data/store';

const LINKS: { to: string; label: string; icon: IconName }[] = [
  { to: '/adm/painel', label: 'Visão geral', icon: 'grid' },
  { to: '/adm/agenda', label: 'Agenda', icon: 'calendar' },
  { to: '/adm/servicos', label: 'Serviços', icon: 'scissors' },
  { to: '/adm/produtos', label: 'Produtos', icon: 'bag' },
  { to: '/adm/profissionais', label: 'Profissionais', icon: 'users' },
  { to: '/adm/clientes', label: 'Clientes', icon: 'user' },
  { to: '/adm/banners', label: 'Banners e fotos', icon: 'image' },
  { to: '/adm/config', label: 'Configurações', icon: 'settings' },
];

export default function AdminLayout() {
  const { logout, db } = useDB();
  const nav = useNavigate();

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <div className="col" style={{ gap: 6, flex: 1 }}>
          <div className="flex" style={{ padding: '6px 10px 12px' }}>
            <span className="brand-mark" style={{ width: 34, height: 34, borderRadius: 11 }}>
              <Icon name="shield" size={17} />
            </span>
            <div>
              <strong style={{ fontSize: 14 }}>Painel ADM</strong>
              <div className="small muted truncate" style={{ maxWidth: 140 }}>{db.settings.shopName}</div>
            </div>
          </div>
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => `admin-link ${isActive ? 'active' : ''}`}>
              <Icon name={l.icon} size={17} /> {l.label}
            </NavLink>
          ))}
          <div className="divider" />
          <a className="admin-link" href="/" target="_blank" rel="noreferrer">
            <Icon name="home" size={17} /> Ver o site
          </a>
          <button
            className="admin-link"
            style={{ background: 'none', cursor: 'pointer', textAlign: 'left' }}
            onClick={() => {
              logout();
              nav('/');
            }}
          >
            <Icon name="logout" size={17} /> Sair
          </button>
        </div>
      </aside>
      <div className="admin-main">
        <Outlet />
      </div>
    </div>
  );
}
