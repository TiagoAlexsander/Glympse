# Arquitetura — Glympse

Visão técnica do projeto: como as peças se encaixam, decisões tomadas e convenções a seguir.

## Panorama

```
┌─────────────┐      HTTP/JSON       ┌──────────────┐   supabase-js   ┌────────────┐
│  Frontend   │ ───────────────────► │   Backend    │ ──────────────► │  Supabase  │
│ React+Vite  │ ◄─────────────────── │ Express API  │ ◄────────────── │ PostgreSQL │
│  (loja+admin)│   Bearer <token>     │  (REST)      │                 │  + Auth    │
└─────────────┘                      └──────────────┘                 └────────────┘
```

- O **frontend** nunca fala com o Supabase direto — sempre via API.
- O **backend** usa dois clientes Supabase: `supabase` (service role, para queries/admin) e `supabaseAuth` (anon key, só login/logout/refresh). Ver `backend/src/config/supabase.ts`.
- **Auth** é delegada ao Supabase Auth (JWT). O backend valida o token e anexa `req.user`.

## Backend

### Organização por módulo de domínio
Cada domínio em `backend/src/modules/<nome>/` tem **dois** arquivos:
- `<nome>.routes.ts` — só define rotas e aplica middlewares. **Nunca contém lógica de negócio.**
- `<nome>.controller.ts` — toda a lógica (acesso ao banco, regras).
- (quando há validação) `<nome>.schemas.ts` — schemas zod.

Módulos: `auth`, `users`, `products`, `categories`, `collections`, `cart`, `wishlist`, `orders`, `payments`, `shipments`, `returns`, `reviews`, `inventory`, `notifications`, `admin`.

Toda rota nova é registrada em `backend/src/app.ts`.

### Middlewares (`backend/src/middlewares/`)
- `auth.middleware.ts` — valida o JWT, anexa `req.user`. Há também `optionalAuthMiddleware` (carrinho de convidado vs. logado).
- `admin.middleware.ts` — exige role `ADMIN`.
- `validate.middleware.ts` — valida o body com um schema zod, retorna 400 com mensagem amigável.
- `rate-limit.middleware.ts` — `authLimiter` (20/15min em login/registro) e `apiLimiter` (120/min em `/api`).

`app.ts` ainda configura `helmet`, `cors` (por `CORS_ORIGIN`) e `app.set('trust proxy', 1)` (para o rate-limit funcionar atrás de proxy/Render).

### Padrão de resposta
Sempre `{ success, data }` / `{ success, error }` / lista com `pagination`. Ver [API.md](API.md).

### Tipagem do banco
Tipos gerados pelo Supabase em `backend/src/types/database.ts`. O cliente é `createClient<Database>`. Em chamadas dinâmicas (RPC, updates genéricos) usa-se `(supabase as any)` pontualmente — limitação conhecida do supabase-js com tipos gerados, não um anti-padrão geral.

## Frontend

- **Rotas**: Wouter (`App.tsx`). Loja em rotas como `/`, `/produtos`, `/produtos/:slug`, `/colecoes`, `/carrinho`, `/checkout`, `/conta`, `/pedidos`; admin sob `/admin/*`.
- **Estado global**: Context API em `src/contexts/` — `AuthContext`, `CartContext`, `WishlistContext`, `NotificationContext`, `ThemeContext`. Não há Redux/Zustand.
- **HTTP**: instância Axios única em `src/services/api.ts` (`baseURL = VITE_API_URL`). Interceptor de **401** desloga o usuário em sessão expirada.
- **Páginas admin**: `src/pages/admin/` dentro do `AdminLayout` (menu lateral). Detalhes de uso: [ADMIN.md](ADMIN.md).
- **Utils**: `src/utils/` centraliza formatação (`formatarReal`, `formatarData`, `formatarDataHora`) e ordenação canônica de tamanhos (`ordemTamanho`, `TAMANHOS_SUGERIDOS`).

### Tema (design system)
- Tailwind **v3** com tokens de cor semânticos via CSS variables (HSL) em `src/index.css`, mapeados em `tailwind.config.js` com `<alpha-value>` (necessário para modificadores de opacidade como `bg-background/80`).
- Tokens: `background`, `foreground`, `primary`, `card`, `secondary`, `muted`, `border`, `input`, `destructive`, `success`.
- **Claro** (`:root`) + **escuro** (`.dark`). No escuro, cards/bordas são "elevados" (card 8%, secondary 14%, border 20%) para contraste sobre fundo preto.
- Cantos retos (`--radius: 0`). Fontes: **Syncopate** (`font-display`, títulos em caixa alta) + **Space Grotesk** (`font-body`); preços em `font-mono`.
- `ThemeContext` persiste a escolha em `localStorage` (`glympse_theme`); um script anti-flash no `index.html` aplica a classe antes do React montar.
- Badges de status são dark-aware: `bg-cor-500/15 text-cor-700 dark:text-cor-400`.

## Decisões e fluxos importantes

- **Reserva de estoque atômica**: ao criar pedido, o backend chama a função SQL `reservar_carrinho(p_items jsonb)` (`backend/sql/atomic-stock.sql`). Se a função não existir, cai para um fallback manual. Estoque só muda por **movimentações** logadas (`IN`/`OUT`/`ADJUSTMENT`), nunca por edição direta de quantidade.
- **Pagamento é mock** (`payments.controller.ts`), pronto para Mercado Pago — troca de ~20 linhas. Cartões terminados em `0000`/`1111`/`9999` são recusados.
- **Carrinho de convidado** usa `session_id`; ao logar, `POST /cart/merge` mescla com o carrinho do usuário.
- **Cupons**: validados no `createOrder` (`max_uses`, `max_uses_per_user`, `min_order_amount`).
- **Coleções nunca são apagadas de verdade** — só ocultadas (`is_active`), preservando os produtos. Variante com pedido associado é desativada em vez de removida.
- **IDs sequenciais** (orders/returns) não são risco de IDOR: a autorização é por `user_id`/`adminMiddleware` no servidor.
- **FKs duplas**: `reviews` e `returns` têm 2 FKs para `users` — queries precisam desambiguar (`users!reviews_user_id_fkey`, `users!returns_user_id_fkey`).

## Restrições do projeto (não violar)

1. **Não trocar de stack** — sem Next.js, Prisma, GraphQL.
2. **Não alterar o banco nem criar migrations** — o schema é fixo (`glympse_supabase_ddl.sql`); funções SQL extras vão em `backend/sql/`.
3. **Service role key só no backend.** Nunca no frontend.
4. Lógica de negócio fica nos controllers, nunca nas rotas.
5. Comentários em português; código simples (dev iniciante em TypeScript).

## Pendências conhecidas (para produção)

- Integração real do **Mercado Pago** e **e-mail transacional** ainda não implementados (planejados como features pós-deploy).
- **Deploy** (Netlify + Render): arquivos de configuração já no repo (`netlify.toml`, `_redirects`, `render.yaml`) — ver passo a passo em [SETUP.md](SETUP.md#9-deploy).
- Polimento: substituir `alert()` por toasts, mais skeletons, acessibilidade.
