/**
 * Cliente da API do SaaS (Cloudflare Worker/Pages + D1).
 *
 * O app funciona em dois modos:
 *  - "remote": existe backend (produção no Cloudflare) → agenda compartilhada entre
 *    o celular do cliente e o painel do ADM.
 *  - "local" : sem backend (offline, preview estático) → tudo salvo no dispositivo,
 *    sem nenhuma quebra de funcionalidade do painel.
 */
import type { Appointment, Banner, DB, Product, Professional, Service, Settings } from '../data/types';

export interface PublicState {
  initialized: boolean;
  settings: Settings | null;
  services: Service[];
  products: Product[];
  professionals: Professional[];
  banners: Banner[];
  appointments: Appointment[];
}

export interface BookingInput {
  clientName: string;
  clientPhone: string;
  serviceId: string;
  professionalId: string;
  date: string;
  time: string;
  notes?: string;
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const request = async (path: string, init: RequestInit = {}, token?: string | null): Promise<Result<any>> => {
  try {
    const headers: Record<string, string> = { 'content-type': 'application/json', accept: 'application/json' };
    if (token) headers.authorization = `Bearer ${token}`;
    const res = await fetch(path, { ...init, headers });
    const text = await res.text();
    let body: any = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    if (!res.ok) {
      return { ok: false, error: body?.message || body?.error || `Erro ${res.status}` };
    }
    return { ok: true, data: body };
  } catch (e) {
    return { ok: false, error: (e as Error).message || 'Falha de rede' };
  }
};

export async function probeApi(): Promise<boolean> {
  try {
    const res = await fetch('/api/health', { headers: { accept: 'application/json' } });
    if (!res.ok) return false;
    const data = await res.json();
    return data?.ok === true;
  } catch {
    return false;
  }
}

export async function fetchPublicState(): Promise<PublicState | null> {
  const res = await request('/api/public');
  return res.ok ? (res.data as PublicState) : null;
}

export async function bootstrapRemote(payload: DB): Promise<boolean> {
  const res = await request('/api/bootstrap', { method: 'POST', body: JSON.stringify(payload) });
  return res.ok;
}

export async function loginRemote(user: string, password: string): Promise<Result<string>> {
  const res = await request('/api/admin/login', { method: 'POST', body: JSON.stringify({ user, password }) });
  return res.ok ? { ok: true, data: String(res.data.token) } : res;
}

export async function fetchAdminState(token: string): Promise<DB | null> {
  const res = await request('/api/admin/state', {}, token);
  if (!res.ok) return null;
  return (res.data?.state as DB) || null;
}

export async function saveAdminState(token: string, db: DB): Promise<boolean> {
  const res = await request('/api/admin/state', { method: 'PUT', body: JSON.stringify(db) }, token);
  return res.ok;
}

export async function changePasswordRemote(token: string, current: string, next: string): Promise<Result<string>> {
  const res = await request('/api/admin/password', { method: 'POST', body: JSON.stringify({ current, next }) }, token);
  return res.ok ? { ok: true, data: String(res.data.token || token) } : res;
}

export async function createBookingRemote(input: BookingInput): Promise<Result<Appointment>> {
  const res = await request('/api/booking', { method: 'POST', body: JSON.stringify(input) });
  return res.ok ? { ok: true, data: res.data.appointment as Appointment } : res;
}

export async function fetchMyBookings(phone: string): Promise<Appointment[]> {
  const res = await request('/api/my', { method: 'POST', body: JSON.stringify({ phone }) });
  return res.ok ? ((res.data.appointments as Appointment[]) || []) : [];
}

export async function cancelBookingRemote(phone: string, id: string): Promise<boolean> {
  const res = await request('/api/booking/cancel', { method: 'POST', body: JSON.stringify({ phone, id }) });
  return res.ok;
}

/**
 * Junta a visão pública do servidor com o resto da base.
 * A agenda é SEMPRE do servidor (modo compartilhado): os agendamentos guardados
 * no dispositivo não podem entrar na conta, senão horários apareceriam bloqueados
 * pelos dados de exemplo de cada aparelho.
 */
export function mergeRemoteState(pub: PublicState, fallback: DB): DB {
  return {
    version: fallback.version,
    settings: pub.settings ? { ...fallback.settings, ...pub.settings } : fallback.settings,
    services: pub.services?.length ? pub.services : fallback.services,
    products: pub.products?.length ? pub.products : fallback.products,
    professionals: pub.professionals?.length ? pub.professionals : fallback.professionals,
    banners: pub.banners?.length ? pub.banners : fallback.banners,
    appointments: pub.appointments || [],
  };
}
