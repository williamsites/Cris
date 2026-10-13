import { IMG } from './images';
import { addDays, DEFAULT_ADMIN_HASH, shortCode, todayISO, uid } from '../lib/utils';
import type { DB, OpeningHours, Service } from './types';

const hours: OpeningHours[] = [
  { open: false, start: '09:00', end: '18:00' },                                 // domingo
  { open: false, start: '09:00', end: '20:00' },                                 // segunda
  { open: true, start: '09:00', end: '20:00', breakStart: '12:00', breakEnd: '13:00' }, // terça
  { open: true, start: '09:00', end: '20:00', breakStart: '12:00', breakEnd: '13:00' }, // quarta
  { open: true, start: '09:00', end: '20:00', breakStart: '12:00', breakEnd: '13:00' }, // quinta
  { open: true, start: '09:00', end: '21:00', breakStart: '12:00', breakEnd: '13:00' }, // sexta
  { open: true, start: '09:00', end: '19:00', breakStart: '12:00', breakEnd: '13:00' }, // sábado
];

const SERVICES: Service[] = [
  { id: 'svc_corte', name: 'Corte Clássico', description: 'Tesoura e máquina com acabamento na navalha e finalização.', price: 45, durationMin: 40, image: IMG.cutHands, active: true, featured: true },
  { id: 'svc_fade', name: 'Corte Degradê (Fade)', description: 'Degradê desenhado, sobrancelha inclusa e acabamento perfeito.', price: 55, durationMin: 45, image: IMG.tattooBarber, active: true, featured: true },
  { id: 'svc_barba', name: 'Barba Terapia', description: 'Toalha quente, óleo, navalha e bálsamo calmante.', price: 40, durationMin: 30, image: IMG.cuttingBack, active: true, featured: true },
  { id: 'svc_combo', name: 'Combo Corte + Barba', description: 'O clássico completo da Cris Barber com desconto.', price: 80, durationMin: 70, image: IMG.interior, active: true, featured: true },
  { id: 'svc_sobrancelha', name: 'Sobrancelha na Navalha', description: 'Design masculino discreto e bem definido.', price: 20, durationMin: 15, image: IMG.maskedBarber, active: true, featured: false },
  { id: 'svc_platinado', name: 'Platinado / Descoloração', description: 'Descoloração global ou luzes com matização.', price: 150, durationMin: 120, image: IMG.shopBack, active: true, featured: false },
  { id: 'svc_pigmentacao', name: 'Pigmentação de Grisalhos', description: 'Camuflagem de grisalhos em cabelo e barba.', price: 70, durationMin: 45, image: IMG.vintageChair, active: true, featured: false },
  { id: 'svc_pezinho', name: 'Pezinho / Acabamento', description: 'Manutenção rápida para manter o corte em dia.', price: 25, durationMin: 20, image: IMG.tools, active: true, featured: false },
  { id: 'svc_hidratacao', name: 'Hidratação + Reload', description: 'Reconstrução, hidratação profunda e massagem capilar.', price: 60, durationMin: 40, image: IMG.shopBack, active: true, featured: false },
  { id: 'svc_kids', name: 'Corte Infantil', description: 'Atendimento paciente para os pequenos até 10 anos.', price: 40, durationMin: 30, image: IMG.cuttingBack, active: true, featured: false },
];

const PRODUCT_EMOJI: Record<string, string> = {
  'Pomada Modeladora': '🧴',
  'Cera Efeito Molhado': '🫙',
  'Óleo para Barba': '💧',
  'Minoxidil Barba': '🧪',
  'Shampoo 2 em 1': '🧼',
  'Pó Texturizador': '✨',
  'Bálsamo Pós-Barba': '🪒',
  'Kit Barba Completo': '🎁',
};

const rawProducts: Array<[string, string, number, number, number, number | undefined]> = [
  ['Pomada Modeladora', 'Fixação forte com efeito matte, não deixa resíduo.', 49, 12, 1, undefined],
  ['Cera Efeito Molhado', 'Brilho leve e modelagem o dia todo.', 45, 8, 1, undefined],
  ['Óleo para Barba', 'Amacia, hidrata e perfuma a barba com aroma amadeirado.', 39, 14, 1, undefined],
  ['Minoxidil Barba', 'Tratamento para estímulo do crescimento da barba.', 59, 6, 0, 119],
  ['Shampoo 2 em 1', 'Limpeza profunda e hidratação para uso diário.', 35, 10, 0, undefined],
  ['Pó Texturizador', 'Volume instantâneo com acabamento seco.', 55, 5, 1, undefined],
  ['Bálsamo Pós-Barba', 'Alívio e hidratação após a navalha.', 42, 9, 1, undefined],
  ['Kit Barba Completo', 'Óleo + bálsamo + pente + escova em estojo Cris Barber.', 129, 4, 2, 159],
];

export function buildSeed(): DB {
  const today = todayISO();
  const yest = addDays(today, -1);
  const tomorrow = addDays(today, 1);

  return {
    version: 1,
    settings: {
      shopName: 'Cris Barber',
      tagline: 'Barbearia e Estética Masculina · São Leopoldo',
      logoUrl: '',
      coverUrl: IMG.interior,
      about:
        'A Cris Barber é a barbearia do Cristian Schorn em São Leopoldo. Ambiente climatizado, atendimento personalizado e os melhores produtos para cabelo e barba. Aqui você marca seu horário em segundos e é atendido sem fila.',
      address: 'Av. Feitoria, 2141',
      city: 'São Leopoldo · RS',
      phone: '(51) 99800-0000',
      whatsapp: '5551998000000',
      instagram: 'https://www.instagram.com/crisbarbeariasaoleopoldo/',
      instagramHandle: '@crisbarbeariasaoleopoldo',
      mapUrl: 'https://www.google.com/maps/search/?api=1&query=Av.+Feitoria,+2141,+S%C3%A3o+Leopoldo',
      slotMinutes: 15,
      minLeadMinutes: 30,
      daysAhead: 21,
      hours,
      adminPasswordHash: DEFAULT_ADMIN_HASH,
      adminUser: 'admin',
      gallery: [IMG.interior, IMG.cutHands, IMG.tattooBarber, IMG.shopBack, IMG.vintageChair, IMG.tools],
      highlights: [
        { icon: '✂️', title: 'Barbeiros especialistas', text: 'Profissionais treinados em cortes clássicos e modernos.' },
        { icon: '⚡', title: 'Sem fila, sem espera', text: 'Você vê os horários reais e chega na hora marcada.' },
        { icon: '💳', title: 'Planos e combos', text: 'Combo corte + barba e clube de assinatura da casa.' },
        { icon: '📍', title: 'Av. Feitoria, 2141', text: 'Fácil acesso e estacionamento na porta em São Leopoldo.' },
      ],
    },
    services: SERVICES,
    products: rawProducts.map(([name, description, price, stock, minStock, promoPrice]) => ({
      id: `prd_${name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_')}`,
      name,
      description,
      price,
      promoPrice,
      stock,
      image: '',
      emoji: PRODUCT_EMOJI[name] || '💈',
      active: true,
      minStock,
    })),
    professionals: [
      {
        id: 'pro_cristian',
        name: 'Cristian Schorn',
        role: 'Master Barber · Fundador',
        bio: 'Especialista em degradê navalhado, barba terapia e coloração masculina. Mais de 10 anos de estrada.',
        photo: IMG.tattooBarber,
        serviceIds: [],
        workdays: [1, 2, 3, 4, 5, 6],
        start: '09:00',
        end: '20:00',
        active: true,
        rating: 5,
      },
      {
        id: 'pro_luan',
        name: 'Luan Pereira',
        role: 'Barbeiro',
        bio: 'Focado em cortes sociais, infantil e acabamento na navalha.',
        photo: IMG.maskedBarber,
        serviceIds: ['svc_corte', 'svc_fade', 'svc_combo', 'svc_pezinho', 'svc_kids', 'svc_sobrancelha'],
        workdays: [2, 3, 4, 5, 6],
        start: '09:00',
        end: '19:00',
        active: true,
        rating: 4.9,
      },
      {
        id: 'pro_gabriel',
        name: 'Gabriel Souza',
        role: 'Barbeiro & Barba',
        bio: 'Barba terapia, pigmentação e hidratação. Cuidado com os detalhes.',
        photo: IMG.cutHands,
        serviceIds: ['svc_barba', 'svc_combo', 'svc_pigmentacao', 'svc_hidratacao', 'svc_corte', 'svc_sobrancelha'],
        workdays: [2, 3, 4, 5],
        start: '13:00',
        end: '20:00',
        active: true,
        rating: 4.8,
      },
    ],
    banners: [
      { id: 'bnr_1', title: 'Combo Corte + Barba por R$ 80', text: 'O clássico da casa com toalha quente e navalha. Válido de terça a sexta.', image: IMG.interior, ctaLabel: 'Quero meu combo', ctaUrl: '/agendar', active: true },
      { id: 'bnr_2', title: 'Clube Cris Barber', text: '4 cortes por mês com valor fixo e horário reservado para você.', image: IMG.tattooBarber, ctaLabel: 'Assinar o clube', ctaUrl: '/contato', active: true },
      { id: 'bnr_3', title: 'Indique e ganhe R$ 10', text: 'Indique um amigo, ele ganha 10% no primeiro corte e você também.', image: IMG.shopBack, ctaLabel: 'Ver como funciona', ctaUrl: '/contato', active: true },
    ],
    appointments: [
      {
        id: 'apt_seed_1', code: shortCode(), clientName: 'Rafael Machado', clientPhone: '51991234567',
        serviceId: 'svc_combo', professionalId: 'pro_cristian', date: today, time: '09:00',
        durationMin: 70, price: 80, status: 'confirmado', createdAt: new Date().toISOString(),
      },
      {
        id: 'apt_seed_2', code: shortCode(), clientName: 'Diego Almeida', clientPhone: '51992345678',
        serviceId: 'svc_fade', professionalId: 'pro_cristian', date: today, time: '14:00',
        durationMin: 45, price: 55, notes: 'Degradê baixo', status: 'confirmado', createdAt: new Date().toISOString(),
      },
      {
        id: 'apt_seed_3', code: shortCode(), clientName: 'Marcos Vinícius', clientPhone: '51993456789',
        serviceId: 'svc_barba', professionalId: 'pro_cristian', date: today, time: '16:30',
        durationMin: 30, price: 40, status: 'pendente', createdAt: new Date().toISOString(),
      },
      {
        id: 'apt_seed_4', code: shortCode(), clientName: 'Jeferson Lima', clientPhone: '51994567890',
        serviceId: 'svc_corte', professionalId: 'pro_luan', date: today, time: '10:00',
        durationMin: 40, price: 45, status: 'confirmado', createdAt: new Date().toISOString(),
      },
      {
        id: 'apt_seed_5', code: shortCode(), clientName: 'Thiago Nunes', clientPhone: '51995678901',
        serviceId: 'svc_combo', professionalId: 'pro_luan', date: tomorrow, time: '11:00',
        durationMin: 70, price: 80, status: 'confirmado', createdAt: new Date().toISOString(),
      },
      {
        id: 'apt_seed_6', code: shortCode(), clientName: 'Bruno Carvalho', clientPhone: '51996789012',
        serviceId: 'svc_corte', professionalId: 'pro_cristian', date: yest, time: '15:00',
        durationMin: 40, price: 45, status: 'concluido', createdAt: new Date().toISOString(),
      },
    ],
  };
}

export const PROFESSIONAL_FALLBACK = IMG.interior;
export { uid };
