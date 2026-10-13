export type ID = string;

export interface OpeningHours {
  /** 0 = domingo ... 6 = sábado */
  open: boolean;
  start: string; // "09:00"
  end: string;   // "20:00"
  breakStart?: string;
  breakEnd?: string;
}

export interface Service {
  id: ID;
  name: string;
  description: string;
  price: number;
  durationMin: number;
  image: string;
  active: boolean;
  featured: boolean;
}

export interface Product {
  id: ID;
  name: string;
  description: string;
  price: number;
  promoPrice?: number;
  stock: number;
  /** estoque mínimo para alerta no painel */
  minStock?: number;
  image: string;
  /** ícone usado quando o produto não tem foto */
  emoji?: string;
  active: boolean;
}

export interface Professional {
  id: ID;
  name: string;
  role: string;
  bio: string;
  photo: string;
  /** ids de serviços que atende (vazio = todos) */
  serviceIds: ID[];
  /** dias de trabalho (0=domingo) */
  workdays: number[];
  start: string;
  end: string;
  active: boolean;
  rating: number;
}

export type AppointmentStatus = 'pendente' | 'confirmado' | 'concluido' | 'cancelado';

export interface Appointment {
  id: ID;
  code: string;
  clientName: string;
  clientPhone: string;
  serviceId: ID;
  professionalId: ID;
  date: string;   // "2026-10-13"
  time: string;   // "14:30"
  durationMin: number;
  price: number;
  notes?: string;
  status: AppointmentStatus;
  createdAt: string;
}

export interface Banner {
  id: ID;
  title: string;
  text: string;
  image: string;
  ctaLabel?: string;
  ctaUrl?: string;
  active: boolean;
}

export interface Settings {
  shopName: string;
  tagline: string;
  logoUrl: string;
  coverUrl: string;
  about: string;
  address: string;
  city: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  instagramHandle: string;
  mapUrl: string;
  slotMinutes: number;
  /** antecedência mínima em minutos para agendar */
  minLeadMinutes: number;
  /** dias para frente exibidos no agendamento */
  daysAhead: number;
  hours: OpeningHours[]; // 7 posições
  adminPasswordHash: string;
  adminUser: string;
  gallery: string[];
  highlights: { icon: string; title: string; text: string }[];
}

export interface DB {
  version: number;
  settings: Settings;
  services: Service[];
  products: Product[];
  professionals: Professional[];
  appointments: Appointment[];
  banners: Banner[];
}
