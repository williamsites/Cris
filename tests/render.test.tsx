/** Smoke test de renderização: monta todas as rotas (cliente e ADM) e valida o HTML gerado. */
const store = new Map<string, string>();
const mock = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() { return store.size; },
};
// @ts-expect-error mock de browser para o teste
globalThis.localStorage = mock;
// @ts-expect-error mock de browser para o teste
globalThis.sessionStorage = mock;

import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';
import { DBProvider } from '../src/data/store';
import { ToastProvider } from '../src/components/Toast';
import { hashPassword, DEFAULT_ADMIN_HASH } from '../src/lib/utils';

const errors: string[] = [];
const origError = console.error;
console.error = (...args: unknown[]) => {
  errors.push(args.map(String).join(' '));
  origError(...args);
};

const render = (route: string, admin = false) => {
  mock.setItem('crisbarber.session', admin ? '1' : '0');
  return renderToString(
    <StrictMode>
      <MemoryRouter initialEntries={[route]}>
        <DBProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </DBProvider>
      </MemoryRouter>
    </StrictMode>
  );
};

const cases: { route: string; expect: string[]; admin?: boolean }[] = [
  { route: '/', expect: ['Seu corte, seu barbeiro', 'Cris Barber', 'Próxima vaga'] },
  { route: '/servicos', expect: ['Serviços e preços', 'Corte Clássico', 'Combo Corte + Barba'] },
  { route: '/produtos', expect: ['Produtos Cris Barber', 'Pomada Modeladora'] },
  { route: '/profissionais', expect: ['Nossos barbeiros', 'Cristian Schorn', 'Luan Pereira'] },
  { route: '/agendar', expect: ['Agendamento inteligente', 'Reserve seu horário', 'Escolha o serviço'] },
  { route: '/meus-agendamentos', expect: ['Meus agendamentos', 'Informe seu WhatsApp'] },
  { route: '/contato', expect: ['Fale com a Cris Barber', 'Av. Feitoria, 2141', 'Horário de funcionamento'] },
  { route: '/adm', expect: ['Painel ADM', 'will123'] },
  { route: '/adm/painel', expect: ['Painel da barbearia', 'Ocupação de hoje', 'Agenda de hoje'], admin: true },
  { route: '/adm/agenda', expect: ['Controle de horários', 'Novo agendamento'], admin: true },
  { route: '/adm/servicos', expect: ['Serviços', 'Novo serviço'], admin: true },
  { route: '/adm/produtos', expect: ['Produtos e estoque', 'Novo produto'], admin: true },
  { route: '/adm/profissionais', expect: ['Profissionais', 'Novo profissional'], admin: true },
  { route: '/adm/clientes', expect: ['Clientes', 'Rafael Machado'], admin: true },
  { route: '/adm/banners', expect: ['Banners, fotos e quadros', 'Quadros de destaque'], admin: true },
  { route: '/adm/config', expect: ['Configurações do SaaS', 'Horário de funcionamento', 'Trocar senha do ADM'], admin: true },
  { route: '/pagina-inexistente', expect: ['Página não encontrada'] },
];

let pass = 0;
const fails: string[] = [];
for (const c of cases) {
  try {
    const html = render(c.route, c.admin);
    const missing = c.expect.filter((t) => !html.includes(t));
    if (missing.length === 0 && html.length > 800) pass++;
    else fails.push(`${c.route}: ${missing.length ? 'faltando ' + missing.join(', ') : 'HTML curto'} (${html.length} bytes)`);
  } catch (e) {
    fails.push(`${c.route}: exceção ${(e as Error).message}`);
  }
}

hashPassword('will123').then((h) => {
  if (h === DEFAULT_ADMIN_HASH) pass++;
  else fails.push(`senha will123 não corresponde ao hash padrão (${h})`);
  finish();
});

// rota ADM sem sessão não pode vazar dados do painel
const anon = render('/adm/painel', false);
if (!anon.includes('Ocupação de hoje') && !anon.includes('Faturamento hoje')) pass++;
else fails.push('rota ADM protegida renderizou o painel sem sessão ativa');

// URL param de agendamento pré-seleciona serviço/barbeiro
const pre = render('/agendar?servico=svc_combo&prof=pro_cristian');
if (pre.includes('Combo Corte + Barba') && pre.includes('Cristian Schorn')) pass++;
else fails.push('deep link de agendamento não pré-selecionou serviço/barbeiro');

const realErrors = errors.filter((e) => !e.includes('useLayoutEffect') && !e.includes('Warning: useLayoutEffect'));
if (realErrors.length === 0) pass++;
else fails.push('erros de console:\n    ' + realErrors.slice(0, 5).join('\n    '));

function finish() {
  console.log(`\nRenderização: ${pass} verificações OK · ${fails.length} falhas`);
  if (fails.length) {
    fails.forEach((f) => console.log('  ✗', f));
    process.exitCode = 1;
  }
}
