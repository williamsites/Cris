import { useState, useMemo } from 'react';
import { useDB } from '../../data/store';
import { Icon } from '../../components/Icon';
import { Badge, Modal, StatCard } from '../../components/ui';
import { brl, maskPhone, onlyDigits, todayISO } from '../../lib/utils';

export default function AdminClients() {
  const { db } = useDB();
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const clients = useMemo(() => {
    const map = new Map<string, {
      phone: string; name: string; count: number; total: number; last: string; cancels: number; services: string[];
    }>();
    for (const a of db.appointments) {
      const c = map.get(a.clientPhone) || {
        phone: a.clientPhone, name: a.clientName, count: 0, total: 0, last: '', cancels: 0, services: [],
      };
      c.count += 1;
      if (a.status !== 'cancelado') c.total += a.price || 0;
      if (a.status === 'cancelado') c.cancels += 1;
      if (a.date > c.last) { c.last = a.date; c.name = a.clientName; }
      const svc = db.services.find((s) => s.id === a.serviceId)?.name;
      if (svc && !c.services.includes(svc)) c.services.push(svc);
      map.set(a.clientPhone, c);
    }
    return [...map.values()].sort((a, b) => (a.last < b.last ? 1 : -1));
  }, [db]);

  const filtered = clients.filter((c) =>
    q ? (c.name + c.phone).toLowerCase().includes(q.toLowerCase()) : true
  );

  const totalSpent = clients.reduce((acc, c) => acc + c.total, 0);
  const recurring = clients.filter((c) => c.count > 1).length;
  const detail = selected ? clients.find((c) => c.phone === selected) : null;
  const detailAppts = detail ? db.appointments.filter((a) => a.clientPhone === detail.phone).sort((a, b) => (a.date < b.date ? 1 : -1)) : [];

  return (
    <>
      <div className="section-head">
        <div>
          <span className="eyebrow"><Icon name="user" size={13} /> Base de clientes</span>
          <h1 className="section-title mt-8">Clientes</h1>
          <p className="section-kicker">Gerado automaticamente a partir dos agendamentos do SaaS</p>
        </div>
      </div>

      <div className="kpi">
        <StatCard label="Clientes" value={clients.length} hint="com ao menos 1 agendamento" />
        <StatCard label="Recorrentes" value={recurring} hint="mais de um atendimento" />
        <StatCard label="Receita histórica" value={brl(totalSpent)} hint="sem cancelamentos" />
        <StatCard label="Hoje" value={clients.filter((c) => c.last === todayISO()).length} hint="últimos atendidos hoje" />
      </div>

      <div className="card mt-24">
        <input className="input" placeholder="Buscar por nome ou telefone..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="table-wrap mt-16">
        <table>
          <thead>
            <tr><th>Cliente</th><th>WhatsApp</th><th>Atendimentos</th><th>Total gasto</th><th>Última visita</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.phone}>
                <td>
                  <strong>{c.name}</strong>
                  {c.cancels > 0 && <Badge tone="danger">{c.cancels} cancel.</Badge>}
                </td>
                <td className="mono">{maskPhone(c.phone)}</td>
                <td className="mono">{c.count}</td>
                <td className="mono">{brl(c.total)}</td>
                <td className="mono">{c.last}</td>
                <td>
                  <div className="flex">
                    <button className="btn btn-sm" onClick={() => setSelected(c.phone)}>
                      <Icon name="search" size={15} /> Detalhes
                    </button>
                    <a
                      className="btn btn-sm"
                      href={`https://wa.me/55${onlyDigits(c.phone)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Icon name="phone" size={15} />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail && (
        <Modal open title={detail.name} subtitle={`${maskPhone(detail.phone)} · ${detail.count} atendimentos · ${brl(detail.total)}`} onClose={() => setSelected(null)}>
          <div className="col">
            {detailAppts.map((a) => (
              <div className="list-row" key={a.id}>
                <strong className="mono" style={{ width: 90 }}>{a.date}</strong>
                <div className="list-row-main">
                  <strong>{db.services.find((s) => s.id === a.serviceId)?.name}</strong>
                  <p className="small muted">
                    {a.time} · {db.professionals.find((p) => p.id === a.professionalId)?.name} · {brl(a.price)}
                  </p>
                </div>
                <Badge tone={a.status === 'cancelado' ? 'danger' : a.status === 'concluido' ? 'neon' : 'ok'}>{a.status}</Badge>
              </div>
            ))}
          </div>
          <div className="divider" />
          <a
            className="btn btn-portal btn-block"
            href={`https://wa.me/55${onlyDigits(detail.phone)}?text=${encodeURIComponent(`Olá ${detail.name}! Aqui é a ${db.settings.shopName}, vamos marcar seu próximo corte?`)}`}
            target="_blank" rel="noreferrer"
          >
            <Icon name="phone" size={16} /> Enviar mensagem no WhatsApp
          </a>
        </Modal>
      )}
    </>
  );
}
