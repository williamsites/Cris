import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDB } from '../../data/store';
import { Icon } from '../../components/Icon';
import { Badge, Progress, StatCard } from '../../components/ui';
import { occupancy } from '../../lib/scheduling';
import { addDays, brl, formatDateLong, formatDuration, todayISO, WEEKDAYS } from '../../lib/utils';

export default function Dashboard() {
  const { db, updateAppointment, mode } = useDB();
  const today = todayISO();

  const stats = useMemo(() => {
    const active = db.appointments.filter((a) => a.status !== 'cancelado');
    const todayList = active.filter((a) => a.date === today);
    const weekEnd = addDays(today, 6);
    const week = active.filter((a) => a.date >= today && a.date <= weekEnd);
    const month = active.filter((a) => a.date.slice(0, 7) === today.slice(0, 7));
    const revenue = (list: typeof active) => list.reduce((acc, a) => acc + (a.price || 0), 0);
    const clients = new Map<string, { name: string; count: number; total: number; last: string }>();
    for (const a of active) {
      const c = clients.get(a.clientPhone) || { name: a.clientName, count: 0, total: 0, last: '' };
      c.count += 1;
      c.total += a.price || 0;
      if (a.date > c.last) c.last = a.date;
      clients.set(a.clientPhone, c);
    }
    const topServices = db.services
      .map((s) => ({ s, n: active.filter((a) => a.serviceId === s.id).length }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 5);
    return {
      todayList, weekRevenue: revenue(week), monthRevenue: revenue(month), todayRevenue: revenue(todayList),
      clients: clients.size, topServices, pendentes: active.filter((a) => a.status === 'pendente').length,
    };
  }, [db, today]);

  const occ = occupancy(db, today);
  const lowStock = db.products.filter((p) => p.active && p.stock <= (p.minStock ?? 0));
  const timeline = db.appointments
    .filter((a) => a.date === today && a.status !== 'cancelado')
    .sort((a, b) => a.time.localeCompare(b.time));

  return (
    <>
      <div className="section-head">
        <div>
          <span className="eyebrow"><Icon name="grid" size={13} /> Visão geral</span>
          <h1 className="section-title mt-8">Painel da barbearia</h1>
          <p className="section-kicker">{formatDateLong(today)} · {WEEKDAYS[new Date().getDay()]}</p>
        </div>
        <div className="flex">
          <Link className="btn btn-ghost btn-sm" to="/adm/agenda">
            <Icon name="calendar" size={15} /> Ver agenda completa
          </Link>
          <Link className="btn btn-portal btn-sm" to="/adm/servicos">
            <Icon name="plus" size={15} /> Novo serviço
          </Link>
        </div>
      </div>

      {mode === 'local' && (
        <div className="notice notice-warn mb-16" style={{ marginBottom: 18 }}>
          <strong>Modo local:</strong> esta página está rodando sem backend (os dados ficam salvos neste
          dispositivo). Ao publicar no Cloudflare com o banco D1, a agenda passa a ser compartilhada entre os
          celulares dos clientes e este painel.
        </div>
      )}

      <div className="kpi">
        <StatCard label="Agendamentos hoje" value={stats.todayList.length} icon={<Icon name="calendar" size={16} />} hint={`${stats.pendentes} aguardando confirmação`} />
        <StatCard label="Faturamento hoje" value={brl(stats.todayRevenue)} icon={<Icon name="wallet" size={16} />} hint="serviços confirmados do dia" />
        <StatCard label="Próximos 7 dias" value={brl(stats.weekRevenue)} icon={<Icon name="trending" size={16} />} hint="previsão da semana" />
        <StatCard label="Faturamento do mês" value={brl(stats.monthRevenue)} icon={<Icon name="chart" size={16} />} hint="mês corrente" />
        <StatCard label="Clientes" value={stats.clients} icon={<Icon name="users" size={16} />} hint="cadastrados via agendamento" />
      </div>

      <div className="row row-2 mt-24" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="flex-between">
            <h3 className="card-title">Ocupação de hoje</h3>
            <Badge tone={occ.pct > 75 ? 'ok' : occ.pct > 40 ? 'warn' : 'neon'}>{occ.pct}%</Badge>
          </div>
          <p className="small muted mt-8">
            {Math.floor(occ.booked / 60)}h{String(occ.booked % 60).padStart(2, '0')} de {Math.floor(occ.capacity / 60)}h
            {String(occ.capacity % 60).padStart(2, '0')} disponíveis na equipe
          </p>
          <div className="mt-16"><Progress value={occ.pct} /></div>
          <div className="divider" />
          <div className="col">
            {db.professionals.filter((p) => p.active).map((p) => {
              const o = occupancy(db, today, p.id);
              return (
                <div key={p.id}>
                  <div className="flex-between small">
                    <span>{p.name}</span>
                    <span className="muted">
                      {db.appointments.filter((a) => a.date === today && a.professionalId === p.id && a.status !== 'cancelado').length} atendimentos · {o.pct}%
                    </span>
                  </div>
                  <div className="mt-8"><Progress value={o.pct} /></div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="flex-between">
            <h3 className="card-title">Agenda de hoje</h3>
            <Link className="small" to="/adm/agenda">abrir</Link>
          </div>
          {timeline.length === 0 ? (
            <p className="small muted mt-16">Nenhum atendimento marcado para hoje.</p>
          ) : (
            <div className="col mt-16">
              {timeline.map((a) => {
                const svc = db.services.find((s) => s.id === a.serviceId);
                const pro = db.professionals.find((p) => p.id === a.professionalId);
                return (
                  <div className="list-row" key={a.id}>
                    <strong className="mono" style={{ width: 52 }}>{a.time}</strong>
                    <div className="list-row-main">
                      <strong className="truncate">{a.clientName}</strong>
                      <p className="small muted truncate">
                        {svc?.name} · {pro?.name} · {formatDuration(a.durationMin)} · {brl(a.price)}
                      </p>
                    </div>
                    {a.status === 'pendente' ? (
                      <button className="btn btn-ok btn-sm" onClick={() => updateAppointment(a.id, { status: 'confirmado' })}>
                        <Icon name="check" size={15} /> Confirmar
                      </button>
                    ) : (
                      <Badge tone={a.status === 'concluido' ? 'neon' : 'ok'}>{a.status}</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="row row-2 mt-24" style={{ alignItems: 'start' }}>
        <div className="card">
          <h3 className="card-title">Serviços mais procurados</h3>
          <div className="col mt-16">
            {stats.topServices.map(({ s, n }) => (
              <div key={s.id}>
                <div className="flex-between small">
                  <span>{s.name}</span>
                  <span className="muted">{n}× · {brl(s.price)}</span>
                </div>
                <div className="mt-8">
                  <Progress value={(n / Math.max(1, stats.topServices[0].n)) * 100} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex-between">
            <h3 className="card-title">Alertas de estoque</h3>
            <Link className="small" to="/adm/produtos">gerenciar</Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="small muted mt-16">Todo o estoque está acima do mínimo. ✅</p>
          ) : (
            <div className="col mt-16">
              {lowStock.map((p) => (
                <div className="list-row" key={p.id}>
                  <span style={{ fontSize: 22 }}>{p.emoji || '🧴'}</span>
                  <div className="list-row-main">
                    <strong>{p.name}</strong>
                    <p className="small muted">estoque mínimo: {p.minStock ?? 0}</p>
                  </div>
                  <Badge tone={p.stock <= 0 ? 'danger' : 'warn'}>{p.stock} un.</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
