# Glympse

E-commerce de moda full-stack — monorepo com backend (API REST) e frontend (loja + painel administrativo) na mesma raiz. Visual minimalista preto e branco, com tema claro/escuro.

**🔗 Demo ao vivo:** [glympsestore.me](https://glympsestore.me)

> O backend usa o plano gratuito da Render, que "dorme" após inatividade — o **primeiro acesso pode levar ~30–50s** para responder.

> Projeto de estudo/portfólio. Pagamento é um **mock** preparado para integração futura com Mercado Pago.

---

## Stack

**Backend** — Node.js · Express · TypeScript · `@supabase/supabase-js` (sem ORM) · zod · express-rate-limit · helmet · cors
**Frontend** — React 19 · TypeScript · Vite · Tailwind CSS v3 (tema via CSS variables) · Wouter (rotas) · Axios
**Banco** — Supabase (PostgreSQL) · Auth do Supabase (JWT)
**Imagens de catálogo** — Pexels (seed) exibidas em P&B

---

## Visão geral

- **Loja**: home com hero/carrossel, catálogo com busca/filtros, página de produto com variantes (tamanhos), carrinho (convidado + logado com merge), wishlist, coleções, checkout com cupom e ViaCEP, pagamento (PIX/cartão mock), pedidos, devoluções e perfil.
- **Painel admin**: dashboard, pedidos (status, rastreio), catálogo (produtos/categorias/coleções), estoque (movimentações com histórico), devoluções, avaliações e usuários.
- **Tema**: preto/branco minimalista (fontes Syncopate + Space Grotesk), claro e escuro com alternância persistida.

Documentação detalhada em [`docs/`](docs/):
- [Arquitetura](docs/ARCHITECTURE.md) · [Referência da API](docs/API.md) · [Setup & Operação](docs/SETUP.md) · [Manual do Admin](docs/ADMIN.md)

---

## Como rodar (desenvolvimento)

Pré-requisitos: **Node.js 20+** e um projeto **Supabase** com o schema aplicado (`glympse_supabase_ddl.sql`).

```bash
# 1. Backend
cd backend
cp .env.example .env          # preencha as chaves do Supabase
npm install
npm run dev                   # http://localhost:3333

# 2. Frontend (em outro terminal)
cd frontend
cp .env.example .env          # ajuste VITE_API_URL se necessário
npm install
npm run dev                   # http://localhost:5173
```

Detalhes de variáveis de ambiente, seed do catálogo e funções SQL: veja [docs/SETUP.md](docs/SETUP.md).

---

## Estrutura

```
glympse/
├── backend/
│   ├── src/
│   │   ├── config/         # cliente Supabase (service role + anon)
│   │   ├── middlewares/    # auth, admin, validate (zod), rate-limit
│   │   ├── modules/        # um módulo por domínio: <nome>.controller.ts + <nome>.routes.ts
│   │   ├── scripts/        # seed/reset/utilitários (ts-node)
│   │   ├── types/          # tipos gerados do Supabase (database.ts)
│   │   ├── app.ts          # Express configurado
│   │   └── server.ts       # porta 3333
│   ├── sql/                # funções SQL a aplicar no Supabase (ex: atomic-stock.sql)
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/     # UI compartilhada (ProductCard, navbar, carrosséis, etc.)
│   │   ├── contexts/       # Auth, Cart, Wishlist, Notification, Theme
│   │   ├── pages/          # páginas da loja + pages/admin/ (painel)
│   │   ├── services/api.ts # instância Axios central
│   │   └── utils/          # formatação (R$, datas), ordenação de tamanhos
│   └── .env.example
│
├── docs/                   # documentação (este conjunto)
└── glympse_supabase_ddl.sql # schema do banco
```

---

## Scripts úteis

| Onde | Comando | O que faz |
|------|---------|-----------|
| backend | `npm run dev` | sobe a API com nodemon |
| backend | `npm run check` | checagem de tipos (tsc) |
| frontend | `npm run dev` | sobe a loja (Vite) |
| frontend | `npm run build` | build de produção |
| backend | `npx ts-node src/scripts/seed-loja.ts` | popula ~300 produtos (precisa de `PEXELS_API_KEY`) |
| backend | `npx ts-node src/scripts/reset-loja.ts --confirm` | limpa todo o catálogo + dados transacionais |
| backend | `npx ts-node src/scripts/make-admin.ts <email>` | promove um usuário a ADMIN |

Mais scripts e operação: [docs/SETUP.md](docs/SETUP.md).

---

## Status

**No ar em produção:** [glympsestore.me](https://glympsestore.me) — frontend na Netlify (domínio próprio + HTTPS) e backend na Render, ambos conectados ao Supabase.

Loja e painel admin completos e funcionais (tema claro/escuro). Pagamento em modo **mock**. Features planejadas como pós-deploy: integração real do Mercado Pago, e-mail transacional e polimento (ver [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)).
