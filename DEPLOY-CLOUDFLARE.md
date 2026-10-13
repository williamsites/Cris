# 🚀 Como publicar o Cris Barber SaaS no seu Cloudflare

Guia passo a passo, do zero até o site no ar com **agenda compartilhada** (o que o cliente
marca no celular aparece no painel da barbearia).

- Tempo: ~10 minutos
- Custo: **grátis** (Cloudflare Workers free + D1 free são suficientes para uma barbearia)
- O que você precisa: uma conta Cloudflare (grátis) e o Node.js instalado (versão 20 ou superior)

---

## ✅ Passo 1 — Abrir a pasta do projeto

Extraia o zip e abra o terminal **dentro da pasta** (`cris-barber-saas`).

```bash
npm install
```

## ✅ Passo 2 — Entrar na sua conta Cloudflare

```bash
npx wrangler login
```

Vai abrir o navegador pedindo autorização. Clique em **Allow**.

## ✅ Passo 3 — Criar o banco de dados do SaaS (D1)

```bash
npx wrangler d1 create cris-barber-db
```

O comando devolve algo assim:

```
[[d1_databases]]
binding = "DB"
database_name = "cris-barber-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"   ← copie este valor
```

Abra o arquivo **`wrangler.toml`** e troque:

```toml
database_id = "SUBSTITUA-PELO-ID-DO-SEU-BANCO"
```

pelo id que você copiou (mantenha as aspas).

> É esse banco que guarda serviços, produtos, profissionais, banners, clientes e todos os
> agendamentos. A tabela é criada automaticamente no primeiro acesso — não precisa rodar SQL.

## ✅ Passo 4 — Criar o segredo do painel ADM

O token de login do painel é assinado com um segredo só seu:

```bash
# gera um segredo aleatório (copie o resultado)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# cole o valor quando o comando abaixo pedir
npx wrangler secret put AUTH_SECRET
```

## ✅ Passo 5 — Gerar o site e publicar

```bash
npm run build
npx wrangler deploy
```

No final aparece a URL do seu site:

```
https://cris-barber.SEU-USUARIO.workers.dev
```

## ✅ Passo 6 — Primeiro acesso e ajustes (faça isso no dia 1)

1. Abra `https://SEU-SITE/adm` → usuário **`admin`** · senha **`will123`**
2. **Troque a senha**: ADM → *Configurações → Segurança → Trocar senha do ADM*
3. **Coloque seu WhatsApp real**: ADM → *Configurações → Contato e endereço*
   (troque `(51) 99800-0000` e `5551998000000` pelo número da barbearia)
4. **Envie as fotos reais**: ADM → *Banners e fotos* (galeria, logo e banner principal)
5. Confira os preços e durações em *Serviços*, e a escala de cada barbeiro em *Profissionais*
6. Mande o link para os clientes agendarem 💈

> Os 6 agendamentos de exemplo (nomes de demonstração) podem ser cancelados ou excluídos
> um por um em **ADM → Agenda**, ou apagados de uma vez em *Configurações → Restaurar dados de exemplo*
> (atenção: isso volta tudo para o padrão, incluindo preços).

---

## 🎨 Opção B — Publicar pelo Cloudflare Pages (Git ou upload)

**Com Git (recomendado, permite a API funcionar):**

1. Suba este projeto para um repositório no GitHub/GitLab
2. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**
3. Build command: `npm run build` · Build output: `dist`
4. Depois de criar, vá em **Settings → Functions → D1 database bindings** e adicione
   a variável **`DB`** apontando para o banco `cris-barber-db`
5. Em **Settings → Environment variables**, adicione **`AUTH_SECRET`** (o mesmo segredo do passo 4)
6. Faça um novo deploy para as configurações valerem

> A pasta `functions/` já contém a API para o Pages — não é preciso escrever nada.

**Somente estático (upload manual dos arquivos):**

Suba o conteúdo da pasta **`dist`** como site estático. O SaaS funciona 100% (site, agendamento,
painel ADM), porém em **modo local**: os dados ficam salvos no navegador de cada aparelho e a
agenda **não** é compartilhada entre cliente e barbearia. Para a agenda compartilhada, use os
Passos 1–5 (Workers) ou a Opção B com Git.

---

## 🔄 Como atualizar o site depois de mudanças

```bash
npm run build
npx wrangler deploy
```

Nada de dados é perdido em um novo deploy: o banco D1 e os segredos continuam os mesmos.

## 🌐 Domínio próprio (opcional)

Cloudflare Dashboard → seu Worker (ou projeto Pages) → **Settings → Domains & Routes → Add**,
e aponte por exemplo `agenda.crisbarber.com.br`. Se o domínio estiver na Cloudflare, o DNS e o
certificado HTTPS são criados automaticamente.

---

## 🔧 Problemas comuns

| Sintoma | Causa e solução |
| --- | --- |
| `database_id` inválido / erro no deploy | O `wrangler.toml` ainda tem `SUBSTITUA-PELO-ID-DO-SEU-BANCO`. Rode `npx wrangler d1 list` e cole o id correto |
| Login do ADM recusa `will123` | A senha já foi trocada neste banco. Use a senha nova ou restaure os dados de exemplo |
| "Modo local" aparece no rodapé | A API não respondeu: confira o binding **`DB`** (D1) e se o Worker publicado é o `worker/index.js` |
| Agendamentos não aparecem no painel | O cliente estava em modo local (site estático) ou a reserva veio de outro ambiente — preview e produção têm bancos separados |
| Site abre, mas sem estilo | O build (`npm run build`) não foi rodado antes do `wrangler deploy` |
| Quero começar de novo | ADM → Configurações → *Restaurar dados de exemplo* (o banco volta ao padrão da barbearia) |

---

## 📦 O que tem dentro deste pacote

```
src/                     PWA em React + TypeScript (código-fonte do SaaS)
worker/                  API + site para Cloudflare Workers
functions/               mesma API para Cloudflare Pages
dist/                    site já compilado (pronto para subir/publicar)
public/                  ícones, manifest do PWA, service worker, cabeçalhos
tests/                   testes do motor de agendamento, das telas e da API
wrangler.toml            configuração do Worker + banco D1
package.json             scripts: dev, build, test
```

Comandos úteis:

- `npm run dev` → rodar localmente em http://localhost:3001
- `npm test` → testes do motor de agendamento e das telas
- `BASE_URL=https://seu-site npm run test:deployed` → verifica um site já publicado
