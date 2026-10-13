import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Appointment, Banner, DB, Product, Professional, Service, Settings } from './types';
import { buildSeed } from './seed';
import { hashPassword, uid } from '../lib/utils';
import {
  bootstrapRemote, cancelBookingRemote, changePasswordRemote, createBookingRemote, fetchAdminState,
  fetchMyBookings, fetchPublicState, loginRemote, mergeRemoteState, probeApi, saveAdminState,
  type BookingInput,
} from '../lib/api';

const KEY = 'crisbarber.db.v1';
const TOKEN_KEY = 'crisbarber.token';
const SESSION_KEY = 'crisbarber.session';

export type Mode = 'local' | 'remote';
export type SaveResult = { ok: true; appointment: Appointment } | { ok: false; error: string };

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DB;
      if (parsed && parsed.settings && parsed.services) {
        return { ...buildSeed(), ...parsed, settings: { ...buildSeed().settings, ...parsed.settings } };
      }
    }
  } catch {
    /* base corrompida -> recria */
  }
  return buildSeed();
}

interface Ctx {
  db: DB;
  mode: Mode;
  online: boolean;
  syncing: boolean;
  update: (fn: (d: DB) => DB) => void;
  saveService: (s: Service) => void;
  removeService: (id: string) => void;
  saveProduct: (p: Product) => void;
  removeProduct: (id: string) => void;
  saveProfessional: (p: Professional) => void;
  removeProfessional: (id: string) => void;
  saveBanner: (b: Banner) => void;
  removeBanner: (id: string) => void;
  saveSettings: (patch: Partial<Settings>) => void;
  createAppointment: (a: Omit<Appointment, 'id' | 'createdAt' | 'code'>) => Promise<SaveResult>;
  updateAppointment: (id: string, patch: Partial<Appointment>) => void;
  removeAppointment: (id: string) => void;
  listMyBookings: (phone: string) => Promise<Appointment[]>;
  cancelMyBooking: (phone: string, id: string) => Promise<boolean>;
  resetDemo: () => void;
  importDB: (json: string) => { ok: boolean; error?: string };
  exportDB: () => string;
  isAdmin: boolean;
  login: (user: string, password: string) => Promise<boolean>;
  logout: () => void;
  changePassword: (current: string, next: string) => Promise<boolean>;
}

const DBContext = createContext<Ctx | null>(null);

export function DBProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(() => load());
  const [mode, setMode] = useState<Mode>('local');
  const [online, setOnline] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isAdmin, setIsAdmin] = useState<boolean>(
    () => sessionStorage.getItem(SESSION_KEY) === '1' || !!localStorage.getItem(TOKEN_KEY)
  );

  const skipPush = useRef(true);
  const pushTimer = useRef<number | null>(null);

  const update = useCallback((fn: (d: DB) => DB) => setDb((prev) => fn(prev)), []);

  /* ---------- cache local (sempre ativo, garante uso offline) ---------- */
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch {
      /* storage cheio: foto muito grande no upload */
    }
  }, [db]);

  /* ---------- detecta backend e carrega a base compartilhada ---------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      const up = await probeApi();
      if (!alive || !up) return;
      setOnline(true);
      setMode('remote');

      const stored = localStorage.getItem(TOKEN_KEY);
      if (stored) {
        const full = await fetchAdminState(stored);
        if (!alive) return;
        if (full) {
          skipPush.current = true;
          setDb({ ...buildSeed(), ...full, settings: { ...buildSeed().settings, ...full.settings } });
          setToken(stored);
          setIsAdmin(true);
          return;
        }
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setIsAdmin(false);
      }

      let pub = await fetchPublicState();
      if (!alive) return;
      if (pub && pub.initialized === false) {
        await bootstrapRemote(buildSeed());
        pub = await fetchPublicState();
      }
      if (pub && pub.initialized) {
        skipPush.current = true;
        setDb((local) => mergeRemoteState(pub as NonNullable<typeof pub>, local));
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- espelha as alterações do ADM no servidor ---------- */
  useEffect(() => {
    if (mode !== 'remote' || !isAdmin || !token) return;
    if (skipPush.current) {
      skipPush.current = false;
      return;
    }
    if (pushTimer.current) window.clearTimeout(pushTimer.current);
    pushTimer.current = window.setTimeout(async () => {
      setSyncing(true);
      const ok = await saveAdminState(token, db);
      setSyncing(false);
      if (!ok) setOnline(false);
    }, 900);
    return () => {
      if (pushTimer.current) window.clearTimeout(pushTimer.current);
    };
  }, [db, mode, isAdmin, token]);

  const refreshPublic = useCallback(async () => {
    const pub = await fetchPublicState();
    if (pub && pub.initialized) {
      skipPush.current = true;
      setDb((local) => mergeRemoteState(pub, local));
    }
  }, []);

  const upsert = <T extends { id: string }>(list: T[], item: T) => {
    const i = list.findIndex((x) => x.id === item.id);
    if (i === -1) return [...list, item];
    const copy = [...list];
    copy[i] = item;
    return copy;
  };

  const value = useMemo<Ctx>(() => {
    const api: Ctx = {
      db,
      mode,
      online,
      syncing,
      update,
      saveService: (s) => update((d) => ({ ...d, services: upsert(d.services, s) })),
      removeService: (id) => update((d) => ({ ...d, services: d.services.filter((x) => x.id !== id) })),
      saveProduct: (p) => update((d) => ({ ...d, products: upsert(d.products, p) })),
      removeProduct: (id) => update((d) => ({ ...d, products: d.products.filter((x) => x.id !== id) })),
      saveProfessional: (p) => update((d) => ({ ...d, professionals: upsert(d.professionals, p) })),
      removeProfessional: (id) =>
        update((d) => ({ ...d, professionals: d.professionals.filter((x) => x.id !== id) })),
      saveBanner: (b) => update((d) => ({ ...d, banners: upsert(d.banners, b) })),
      removeBanner: (id) => update((d) => ({ ...d, banners: d.banners.filter((x) => x.id !== id) })),
      saveSettings: (patch) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } })),

      createAppointment: async (a) => {
        /* ---- modo compartilhado: o servidor valida o horário ---- */
        if (mode === 'remote') {
          const input: BookingInput = {
            clientName: a.clientName,
            clientPhone: a.clientPhone,
            serviceId: a.serviceId,
            professionalId: a.professionalId,
            date: a.date,
            time: a.time,
            notes: a.notes,
          };
          const res = await createBookingRemote(input);
          if (!res.ok) {
            await refreshPublic();
            return { ok: false, error: res.error };
          }
          const created: Appointment = { ...res.data, status: a.status || res.data.status };
          setDb((d) => ({ ...d, appointments: [...d.appointments.filter((x) => x.id !== created.id), created] }));
          await refreshPublic();
          return { ok: true, appointment: created };
        }

        /* ---- modo local: valida no aparelho ---- */
        const clash = db.appointments.find(
          (x) =>
            x.professionalId === a.professionalId &&
            x.date === a.date &&
            x.status !== 'cancelado' &&
            a.time < addMin(x.time, x.durationMin || 30) &&
            x.time < addMin(a.time, a.durationMin || 30)
        );
        if (clash) return { ok: false, error: 'Esse horário acabou de ser reservado. Escolha outro.' };
        const appt: Appointment = { ...a, id: uid('apt'), code: code6(), createdAt: new Date().toISOString() };
        update((d) => ({ ...d, appointments: [...d.appointments, appt] }));
        return { ok: true, appointment: appt };
      },

      updateAppointment: (id, patch) =>
        update((d) => ({
          ...d,
          appointments: d.appointments.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      removeAppointment: (id) =>
        update((d) => ({ ...d, appointments: d.appointments.filter((x) => x.id !== id) })),

      listMyBookings: async (phone) => {
        if (mode === 'remote') {
          const list = await fetchMyBookings(phone);
          if (list.length) {
            setDb((d) => {
              const ids = new Set(list.map((a) => a.id));
              return { ...d, appointments: [...d.appointments.filter((a) => !ids.has(a.id)), ...list] };
            });
          }
          return list;
        }
        return db.appointments.filter((a) => a.clientPhone === phone);
      },

      cancelMyBooking: async (phone, id) => {
        if (mode === 'remote') {
          const ok = await cancelBookingRemote(phone, id);
          if (!ok) return false;
          update((d) => ({
            ...d,
            appointments: d.appointments.map((a) => (a.id === id ? { ...a, status: 'cancelado' } : a)),
          }));
          await refreshPublic();
          return true;
        }
        update((d) => ({
          ...d,
          appointments: d.appointments.map((a) => (a.id === id ? { ...a, status: 'cancelado' } : a)),
        }));
        return true;
      },

      resetDemo: () => setDb(buildSeed()),
      exportDB: () => JSON.stringify(db, null, 2),
      importDB: (json) => {
        try {
          const parsed = JSON.parse(json) as DB;
          if (!parsed.settings || !Array.isArray(parsed.services)) {
            return { ok: false, error: 'Arquivo inválido: estrutura não reconhecida.' };
          }
          setDb({ ...buildSeed(), ...parsed });
          return { ok: true };
        } catch (e) {
          return { ok: false, error: 'JSON inválido: ' + (e as Error).message };
        }
      },

      isAdmin,

      login: async (user, password) => {
        if (mode === 'remote') {
          const res = await loginRemote(user, password);
          if (!res.ok) return false;
          const full = await fetchAdminState(res.data);
          localStorage.setItem(TOKEN_KEY, res.data);
          sessionStorage.setItem(SESSION_KEY, '1');
          setToken(res.data);
          setIsAdmin(true);
          if (full) {
            skipPush.current = true;
            setDb({ ...buildSeed(), ...full, settings: { ...buildSeed().settings, ...full.settings } });
          }
          return true;
        }
        const hash = await hashPassword(password);
        const ok =
          user.trim().toLowerCase() === db.settings.adminUser.toLowerCase() &&
          hash === db.settings.adminPasswordHash;
        if (ok) {
          sessionStorage.setItem(SESSION_KEY, '1');
          setIsAdmin(true);
        }
        return ok;
      },

      logout: () => {
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setIsAdmin(false);
        if (mode === 'remote') void refreshPublic();
      },

      changePassword: async (current, next) => {
        if (mode === 'remote' && token) {
          const res = await changePasswordRemote(token, current, next);
          if (!res.ok) return false;
          localStorage.setItem(TOKEN_KEY, res.data);
          setToken(res.data);
          return true;
        }
        const cur = await hashPassword(current);
        if (cur !== db.settings.adminPasswordHash) return false;
        const hash = await hashPassword(next);
        update((d) => ({ ...d, settings: { ...d.settings, adminPasswordHash: hash } }));
        return true;
      },
    };
    return api;
  }, [db, isAdmin, mode, online, syncing, token, update, refreshPublic]);

  return <DBContext.Provider value={value}>{children}</DBContext.Provider>;
}

const addMin = (hhmm: string, m: number) => {
  const [h, mi] = hhmm.split(':').map(Number);
  const t = h * 60 + mi + m;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};
const code6 = () => {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
};

export function useDB() {
  const ctx = useContext(DBContext);
  if (!ctx) throw new Error('useDB precisa estar dentro de <DBProvider>');
  return ctx;
}
