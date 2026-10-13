# 💈 Cris Barber · SaaS PWA de Barbearia e Agendamento

SaaS completo (PWA instalável) para a **Cris Barber — Av. Feitoria, 2141 · São Leopoldo/RS**.
Interface preta com tipografia branca, botões de **portal azul neon** e banners arredondados modernos.

- Instagram oficial: [@crisbarbeariasaoleopoldo](https://www.instagram.com/crisbarbeariasaoleopoldo/) · Responsável: **@cristianschorn**
- **Painel ADM:** usuário `admin` · senha `will123` (troque em *Configurações → Segurança*)
- **Preview local:** `npm install && npm run dev` → http://localhost:3001
- **Publicar no seu Cloudflare:** veja o guia passo a passo em [`DEPLOY-CLOUDFLARE.md`](./DEPLOY-CLOUDFLARE.md)

---

## ✨ O que o sistema faz

### Área do cliente
| Recurso | Detalhe |
| --- | --- |
| Agendamento inteligente | O motor cruza **funcionamento da barbearia + escala do barbeiro + duração do serviço + clientes já marcados** e mostra **apenas os horários realmente livres** |
| Dia fechado / cheio | Aparece apagado na faixa de dias, com aviso de "fechado" ou "cheio" |
| Anti-duplicidade | Se alguém reservar o mesmo horário antes de você, a reserva é recusada e você é avisado |
| Serviços, barbeiros e loja | Cards com foto, preço, duração, avaliação, estoque e promoção |
| Meus agendamentos | Busca por WhatsApp, status, cancelamento e botão para falar no WhatsApp |
| Agenda do celular | Botão que baixa o evento `.ics` da reserva |
| PWA | Instalável no celular, funciona offline com service worker |

### Painel ADM (controle geral)
| Módulo | O que dá para fazer |
| --- | --- |
| Visão geral | Agendamentos do dia, faturamento (dia/semana/mês), ocupação por barbeiro, serviços mais procurados, alertas de estoque |
| Agenda | Filtros por dia/barbeiro/status, confirmar, concluir, cancelar, WhatsApp do cliente, **encaixe manual** com validação de conflito |
| Serviços | Criar/editar/ocultar, preço, **duração** (define a grade de horários), destaque na home, foto |
| Produtos | Preço, promoção, estoque com +/-, estoque mínimo, ícone, foto |
| Profissionais | Nome, cargo, bio, foto, **dias de trabalho**, horário de entrada/saída, serviços que atende, ativar/desativar |
| Clientes | Base gerada pelos agendamentos: quantos atendimentos, total gasto, última visita, histórico e WhatsApp |
| Banners e fotos | Banners da home, quadros de destaque, galeria de fotos e logomarca/capa |
| Configurações | Nome, slogan, sobre, endereço, WhatsApp, Instagram, mapa, **horário de funcionamento** (com pausa), regras de agendamento, **troca de senha do ADM**, backup/restauração em `.json` |

Todas as imagens aceitam **URL** ou **upload direto do celular/PC** (as fotos ficam salvas na própria base).

---

## 🚀 Como rodar

```bash
npm install          # instala as dependências
npm run dev          # app em http://localhost:3001
npm run build        # gera ./dist (produção)
npm test             # testes do motor de agendamento + renderização das páginas
```

### Com backend compartilhado (opcional no desenvolvimento)

```bash
npx wrangler dev               # sobe a API + D1 local em http://127.0.0.1:8787
npm run dev                    # o Vite já faz proxy de /api para o Worker
```

Sem o Worker, o app roda em **modo local** (dados salvos no navegador) — o painel continua
100% funcional. Com o Worker, a agenda é **compartilhada**: o que o cliente marca no celular
aparece na agenda da barbearia.

### Testes automatizados

```bash
npm test              # motor de agendamento (36 checagens) + render de todas as páginas (21)
bash tests/run-api-tests.sh   # sobe o Worker em workerd + D1 local e valida
                              # a API (42 checagens) e o cliente contra o servidor (17)
```

---

## 🌐 Site publicado (Cloudflare · agenda compartilhada)

| Ambiente | URL | Banco de dados |
| --- | --- | --- |
| **Produção (divulgue este)** | https://site-831b7cf8feae4e9d8652b53b0373d5c3.freebuff.page | D1 de produção |
| Preview (testes internos) | https://site-586f8b06763948e4a40c3436f2bd1cd6.freebuff.page | D1 de preview (separado) |

Os dois ambientes usam **bancos separados**: agendamentos feitos no preview não aparecem em produção e vice-versa.

Verificação automatizada de um site publicado:

```bash
BASE_URL=https://seu-site.freebuff.page npm run test:deployed
```

Ela confere HTML, PWA (manifest + service worker), deep links, API no D1, login do ADM, criação de
agendamento, bloqueio de horário duplicado, consulta e cancelamento pelo cliente, e gravação do painel.

## ☁️ Publicar na sua própria conta Cloudflare (opcional)

### Opção A — Workers (recomendado, arquivo `wrangler.toml` pronto)

```bash
# 1. autenticar e criar o banco de dados do SaaS
npx wrangler login
npx wrangler d1 create cris-barber-db        # copie o database_id retornado

# 2. cole o database_id em wrangler.toml (campo database_id)

# 3. segredo usado para assinar o token do ADM (escolha um texto longo e aleatório)
npx wrangler secret put AUTH_SECRET

# 4. publicar (o build do Vite gera ./dist e o Worker serve API + site)
npm run build && npx wrangler deploy
```

### Opção B — Cloudflare Pages (via Git ou direto)

1. Build command: `npm run build` · Output directory: `dist`
2. Crie o banco: `npx wrangler d1 create cris-barber-db`
3. Em **Settings → Functions → D1 database bindings**, adicione a variável **`DB`** com o banco criado
4. Em **Settings → Environment variables**, adicione **`AUTH_SECRET`** (segredo do token do ADM)
5. A pasta `functions/` já contém a API (`/api/*`) para o Pages — nada mais a fazer

> Na primeira visita, o banco é inicializado automaticamente com os dados da barbearia
> (serviços, produtos, profissionais, horários e a senha padrão `will123`).
> **Troque a senha em Configurações → Segurança logo no primeiro acesso.**

---

## 🖼️ Usando as fotos reais do Instagram

O Instagram não permite baixar as fotos automaticamente, então o SaaS vem com fotografia de
barbearia como padrão. Para usar as **fotos reais da Cris Barber**:

1. Entre no painel ADM → **Banners e fotos**
2. Em *Galeria de fotos*, clique em **Enviar foto** e escolha as imagens
   (baixe-as do perfil [@crisbarbeariasaoleopoldo](https://www.instagram.com/crisbarbeariasaoleopoldo/))
3. Use as mesmas fotos em **Logo**, **Banner principal** (Configurações) e nos
   serviços/produtos/profissionais — cada tela tem upload ou campo de URL

---

## 🧱 Arquitetura

```
src/                      PWA em React + TypeScript (Vite)
  data/                   tipos, dados iniciais (seed) e store (local + compartilhado)
  lib/scheduling.ts       motor de agendamento inteligente
  lib/api.ts              cliente da API (detecta backend automaticamente)
  pages/                  área do cliente (home, serviços, loja, agendamento, meus horários)
  pages/admin/            painel ADM completo
worker/                   Cloudflare Worker (API + assets) com D1
functions/api/            mesma API para Cloudflare Pages
tests/                    testes do motor, das telas e da API em workerd
```

- **Senha do ADM:** nunca é guardada em texto — só o hash SHA-256.
- **Modo local:** tudo em `localStorage` (offline, um dispositivo).
- **Modo compartilhado:** base única no D1 do Cloudflare, com validação do horário no servidor.
- **Backup:** ADM → Configurações → *Baixar backup completo (.json)*.

## 🔐 Credenciais

| Item | Valor |
| --- | --- |
| Usuário ADM | `admin` (editável) |
| Senha ADM | `will123` (troque em Configurações → Segurança) |
| Segredo do token | variável `AUTH_SECRET` no Cloudflare |
