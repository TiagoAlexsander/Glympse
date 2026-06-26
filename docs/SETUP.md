# Setup & Operação — Glympse

Guia para colocar o projeto de pé do zero e operá-lo no dia a dia.

## 1. Pré-requisitos

- **Node.js 20+** e npm
- Um projeto **Supabase** (PostgreSQL + Auth)
- (Opcional) Chave gratuita do **Pexels** — só para o seed de catálogo

## 2. Banco de dados (Supabase)

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, rode o schema completo: `glympse_supabase_ddl.sql` (raiz do repo).
3. Aplique as funções SQL extras em `backend/sql/`:
   - **`atomic-stock.sql`** — cria `reservar_carrinho(p_items jsonb)`, usada na criação de pedidos para reservar estoque de forma atômica. Sem ela, o backend usa um fallback manual (funciona, mas sem garantia de atomicidade sob concorrência).
4. Pegue as chaves em **Project Settings → API**: `Project URL`, `anon key` e `service_role key`.

> ⚠️ A `service_role key` é secreta e fica **só no backend**. Nunca exponha no frontend.

## 3. Variáveis de ambiente

**Backend** (`backend/.env`, baseado em `.env.example`):

| Variável | Descrição |
|----------|-----------|
| `PORT` | Porta da API (padrão `3333`). |
| `SUPABASE_URL` | URL do projeto Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role (queries + auth admin). **Secreta.** |
| `SUPABASE_ANON_KEY` | Chave anon (usada só para login/logout/refresh). |
| `CORS_ORIGIN` | Origens permitidas, separadas por vírgula. Em produção, a URL do frontend. |
| `PEXELS_API_KEY` | Só para `seed-loja.ts`. Sem ela, o seed cai para imagens fallback. |

**Frontend** (`frontend/.env`, baseado em `.env.example`):

| Variável | Descrição |
|----------|-----------|
| `VITE_API_URL` | URL base da API (ex: `http://localhost:3333/api`). |

## 4. Rodar em desenvolvimento

```bash
# Backend
cd backend && npm install && npm run dev      # http://localhost:3333

# Frontend (outro terminal)
cd frontend && npm install && npm run dev     # http://localhost:5173
```

Checagem de tipos (não emite arquivos): `npm run check` em cada pasta.

## 5. Popular a loja (catálogo)

Os scripts ficam em `backend/src/scripts/` e rodam com `ts-node`.

```bash
cd backend

# Popula ~300 produtos em 10 categorias, com imagens do Pexels (P&B).
# Requer PEXELS_API_KEY no .env (sem ela, usa imagens fallback).
npx ts-node src/scripts/seed-loja.ts

# Limpa TODO o catálogo + dados transacionais (pedidos, carrinhos, reviews...).
# Exige a flag --confirm para evitar acidentes. Respeita a ordem de FKs.
npx ts-node src/scripts/reset-loja.ts --confirm
```

Fluxo típico para resetar a loja: `reset-loja.ts --confirm` → `seed-loja.ts`.

## 6. Criar um administrador

O cadastro normal cria usuário com role `USER`. Para promover a `ADMIN`:

```bash
cd backend
npx ts-node src/scripts/make-admin.ts <email-do-usuario>
```

Depois é só logar — o botão **Painel Admin** aparece na navbar.

## 7. Outros scripts utilitários (`backend/src/scripts/`)

| Script | Para que serve |
|--------|----------------|
| `seed-loja.ts` | Catálogo principal (~300 produtos, imagens Pexels). |
| `reset-loja.ts --confirm` | Zera catálogo + dados transacionais. |
| `make-admin.ts <email>` | Promove usuário a ADMIN. |
| `list-users.ts` | Lista usuários cadastrados. |
| `seed-coupons.ts` | Cria cupons de exemplo. |
| `seed-shipping.ts` | Cria métodos de frete (PAC, SEDEX, etc.). |
| `status-teste.ts` | Mostra estado de pedidos/devoluções/envios/reviews. |
| `check-notifs.ts` / `check-reviews.ts` | Inspeção de notificações/avaliações. |
| `fix-images.ts` | Corrige imagens de produtos. |
| `seed-catalogo.ts` / `seed.ts` / `seed-variants.ts` | Seeds antigos/auxiliares (o principal é `seed-loja.ts`). |

## 8. Build de produção

```bash
cd backend  && npm run build && npm start   # compila para dist/ e roda node dist/server.js
cd frontend && npm run build                # gera frontend/dist/ (estático)
```

## 9. Deploy

> **Já em produção:** frontend em [glympsestore.me](https://glympsestore.me) (Netlify,
> domínio próprio + HTTPS) e backend em `glympse-backend.onrender.com` (Render).
> O `CORS_ORIGIN` em produção lista os domínios da loja (apex, `www` e o subdomínio
> `*.netlify.app`), separados por vírgula. O plano free da Render "dorme" após
> inatividade (cold start ~30–50s) — um ping periódico ao `/health` mantém acordado.

Setup: **frontend** estático na Netlify, **backend** na Render. Os arquivos de
configuração já estão no repositório:
- `frontend/netlify.toml` — base, comando de build e pasta de publicação.
- `frontend/public/_redirects` — fallback de SPA (toda rota → `index.html`).
- `backend/render.yaml` — blueprint do serviço (build/start + variáveis).

**Backend (Render):** novo Web Service a partir do repo, root `backend/`,
build `npm install && npm run build`, start `npm start`. Variáveis:
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` e
`CORS_ORIGIN` (= URL do Netlify). A porta é injetada pela Render.

**Frontend (Netlify):** novo site a partir do repo (o `netlify.toml` já define
base/build/publish). Variável `VITE_API_URL` = `https://SEU-BACKEND.onrender.com/api`.

**Conectar as pontas:** após ambos no ar, ajuste `CORS_ORIGIN` (backend) para a
URL do Netlify e `VITE_API_URL` (frontend) para a URL da Render, e faça novo deploy.

> O código já está pronto: o backend lê `process.env.PORT`/`CORS_ORIGIN` e o
> frontend usa `VITE_API_URL` em todas as chamadas (sem `localhost` fixo).

Detalhes de arquitetura e decisões: [ARCHITECTURE.md](ARCHITECTURE.md).
