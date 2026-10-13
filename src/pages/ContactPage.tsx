import { Link } from 'react-router-dom';
import { useDB } from '../data/store';
import { Icon } from '../components/Icon';
import { WEEKDAYS, WEEKDAYS_SHORT } from '../lib/utils';

export default function ContactPage() {
  const { db } = useDB();
  const s = db.settings;
  return (
    <>
      <div className="banner banner-hero" style={{ minHeight: 240, backgroundImage: `url(${s.coverUrl})` }}>
        <div className="banner-body">
          <span className="eyebrow"><Icon name="pin" size={13} /> Onde estamos</span>
          <h1 className="hero-title" style={{ fontSize: 'clamp(26px,5vw,40px)' }}>Fale com a Cris Barber</h1>
          <p className="hero-sub">{s.address} · {s.city}</p>
        </div>
      </div>

      <div className="grid grid-2 mt-24">
        <div className="card">
          <h2 className="section-title" style={{ fontSize: 20 }}>Contato rápido</h2>
          <div className="col mt-16">
            <a className="btn btn-portal btn-block" href={`https://wa.me/${s.whatsapp}?text=${encodeURIComponent('Olá! Vim pelo site da Cris Barber.')}`} target="_blank" rel="noreferrer">
              <Icon name="phone" size={17} /> WhatsApp {s.phone}
            </a>
            <a className="btn btn-ghost btn-block" href={s.instagram} target="_blank" rel="noreferrer">
              <Icon name="instagram" size={17} /> {s.instagramHandle}
            </a>
            <a className="btn btn-ghost btn-block" href={`tel:${s.phone.replace(/\D/g, '')}`}>
              <Icon name="phone" size={17} /> Ligar agora
            </a>
            <a className="btn btn-ghost btn-block" href={s.mapUrl} target="_blank" rel="noreferrer">
              <Icon name="pin" size={17} /> Abrir no Google Maps
            </a>
          </div>
          <div className="divider" />
          <p className="small muted">
            Responsável: <strong style={{ color: '#fff' }}>@cristianschorn</strong> — para mais informações, promoções e
            parcerias fale direto pelo Instagram.
          </p>
        </div>

        <div className="card">
          <h2 className="section-title" style={{ fontSize: 20 }}>Horário de funcionamento</h2>
          <div className="list mt-16">
            {s.hours.map((h, i) => (
              <div key={i} className="flex-between" style={{ padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
                <span>{WEEKDAYS[i]}</span>
                <span className={h.open ? '' : 'muted'}>
                  {h.open ? `${h.start} – ${h.end}` : 'Fechado'}
                  {h.breakStart && <span className="muted small"> · pausa {h.breakStart}–{h.breakEnd}</span>}
                </span>
              </div>
            ))}
          </div>
          <div className="notice mt-16">
            Hoje ({WEEKDAYS_SHORT[new Date().getDay()]}):{' '}
            {s.hours[new Date().getDay()].open
              ? `aberto das ${s.hours[new Date().getDay()].start} às ${s.hours[new Date().getDay()].end}`
              : 'fechado'}
          </div>
          <Link className="btn btn-portal btn-block mt-16" to="/agendar">
            <Icon name="calendar" size={17} /> Ver horários disponíveis
          </Link>
        </div>
      </div>

      <div className="card mt-24">
        <h2 className="section-title" style={{ fontSize: 20 }}>Sobre a barbearia</h2>
        <p className="soft mt-16" style={{ maxWidth: 780 }}>{s.about}</p>
      </div>
    </>
  );
}
