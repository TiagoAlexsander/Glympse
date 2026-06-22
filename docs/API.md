# Referência da API — Glympse

Base local: `http://localhost:3333`
Todas as rotas estão disponíveis sob o prefixo **`/api`** (ex: `/api/products`). As rotas de auth também respondem sem prefixo (`/auth/*`) por compatibilidade.

## Convenções

**Autenticação** — rotas protegidas exigem o header:
```
Authorization: Bearer <access_token>
```
O `access_token` é retornado no login. Marcação usada abaixo:
- 🔓 público · 🔐 requer login · 👑 requer login + role `ADMIN` · 🔓/🔐 login opcional (carrinho de convidado vs. logado)

**Formato de resposta** (sempre):
```jsonc
// Sucesso
{ "success": true, "data": { /* ... */ } }
// Lista paginada
{ "success": true, "data": [ /* ... */ ], "pagination": { "page": 1, "limit": 20, "total": 290 } }
// Erro
{ "success": false, "error": "mensagem do erro" }
```

**Rate limiting** — `/api` em geral: 120 req/min. Login e registro: 20 req/15min.

---

## Auth — `/auth`

| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| POST | `/auth/register` | 🔓 | Cria usuário. Body: `{ email, password, first_name, last_name, ... }` (validado por zod). |
| POST | `/auth/login` | 🔓 | Login. Body: `{ email, password }`. Retorna `user` + `access_token` + `refresh_token`. |
| POST | `/auth/logout` | 🔓 | Encerra a sessão. |
| POST | `/auth/refresh` | 🔓 | Renova o token. Body: `{ refresh_token }`. |
| GET | `/auth/me` | 🔐 | Dados do usuário autenticado. |

## Users — `/users`

| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| GET | `/users/me` | 🔐 | Perfil do usuário logado. |
| PATCH | `/users/me` | 🔐 | Atualiza perfil (validado). |
| GET | `/users/me/addresses` | 🔐 | Lista endereços. |
| POST | `/users/me/addresses` | 🔐 | Cria endereço (validado). |
| PUT | `/users/me/addresses/:id` | 🔐 | Atualiza endereço. |
| DELETE | `/users/me/addresses/:id` | 🔐 | Remove endereço. |

## Products — `/products`

| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| GET | `/products` | 🔓 | Lista/busca. Query: `q`/`search`, `category`, `featured`, `page`, `limit`. Retorna `out_of_stock`/`low_stock` por produto. |
| GET | `/products/:slug` | 🔓 | Detalhe por slug (variantes, imagens, coleções ativas, relacionados). |
| POST | `/products` | 👑 | Cria produto (básico). |
| PUT | `/products/:id` | 👑 | Atualiza produto. |
| DELETE | `/products/:id` | 👑 | Remove produto. |
| GET | `/products/admin/list` | 👑 | Lista admin. Query: `search`, `limit`. |
| GET | `/products/admin/:id` | 👑 | Detalhe admin (variantes c/ estoque). |
| POST | `/products/admin/full` | 👑 | Cria produto completo (variantes/tamanhos + estoque 0). |
| POST | `/products/admin/:id/variants` | 👑 | Adiciona tamanho. Body: `{ size, price }`. |
| PATCH | `/products/admin/variants/:variantId` | 👑 | Atualiza variante (`price`, `is_active` — **não** mexe em estoque). |
| DELETE | `/products/admin/variants/:variantId` | 👑 | Remove variante (desativa se já houve pedido). |
| PUT | `/products/admin/:id/collections` | 👑 | Define coleções do produto. Body: `{ collection_ids: [] }`. |

## Categories — `/categories`

| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| GET | `/categories` | 🔓 | Lista categorias. |
| POST | `/categories` | 👑 | Cria. |
| PUT | `/categories/:id` | 👑 | Atualiza. |
| DELETE | `/categories/:id` | 👑 | Remove. |

## Collections — `/collections`

| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| GET | `/collections/public` | 🔓 | Coleções visíveis (loja). |
| GET | `/collections/:id/products` | 🔓 | Produtos de uma coleção. |
| GET | `/collections/admin/all` | 👑 | Todas (visíveis + ocultas) com contagem. |
| GET | `/collections` | 👑 | Lista admin. |
| POST | `/collections` | 👑 | Cria. |
| PUT | `/collections/:id` | 👑 | Atualiza (`is_active` = visibilidade). |
| DELETE | `/collections/:id` | 👑 | Remove. |
| POST | `/collections/:id/products` | 👑 | Adiciona produto. Body: `{ product_id }`. |
| DELETE | `/collections/:id/products/:productId` | 👑 | Remove produto da coleção. |

## Cart — `/cart`

Carrinho de convidado usa `session_id` (header/cookie); ao logar, é mesclado.

| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| GET | `/cart` | 🔓/🔐 | Carrinho atual. |
| POST | `/cart/items` | 🔓/🔐 | Adiciona item. Body: `{ variant_id, quantity }`. |
| PATCH | `/cart/items/:id` | 🔓/🔐 | Atualiza quantidade. |
| DELETE | `/cart/items/:id` | 🔓/🔐 | Remove item. |
| DELETE | `/cart` | 🔓/🔐 | Esvazia. |
| POST | `/cart/coupon` | 🔓/🔐 | Aplica cupom. Body: `{ code }`. |
| DELETE | `/cart/coupon` | 🔓/🔐 | Remove cupom. |
| POST | `/cart/merge` | 🔐 | Mescla carrinho de convidado ao logar. |

## Wishlist — `/wishlist`

| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| GET | `/wishlist` | 🔐 | Lista favoritos. |
| GET | `/wishlist/ids` | 🔐 | Só os IDs (para marcar corações na UI). |
| POST | `/wishlist/items` | 🔐 | Adiciona. Body: `{ variant_id }`. |
| DELETE | `/wishlist/items/:variantId` | 🔐 | Remove. |

## Orders — `/orders`

| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| GET | `/orders` | 🔐 | Pedidos do usuário (paginado). |
| GET | `/orders/:id` | 🔐 | Detalhe do pedido. |
| POST | `/orders` | 🔐 | Cria pedido (validado; reserva estoque atômica; valida cupom). |
| PATCH | `/orders/:id/cancel` | 🔐 | Cancela pedido. |
| GET | `/orders/shipping-methods` | 🔐 | Métodos de frete disponíveis. |
| GET | `/orders/admin/all` | 👑 | Todos os pedidos. |
| GET | `/orders/admin/:id` | 👑 | Detalhe (admin). |
| PATCH | `/orders/admin/:id/status` | 👑 | Atualiza status do pedido. |

## Payments — `/payments`

> **Mock.** Cartões terminados em `0000`/`1111`/`9999` são recusados. Pronto para Mercado Pago.

| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| POST | `/payments/webhook` | 🔓 | Webhook do gateway. |
| GET | `/payments/:orderId/status` | 🔐 | Status do pagamento. |
| POST | `/payments/:orderId/pix` | 🔐 | Gera cobrança PIX (mock). |
| POST | `/payments/:orderId/card` | 🔐 | Paga com cartão (mock). |
| POST | `/payments/:orderId/simulate` | 🔐 | Simula aprovação (dev). |

## Shipments — `/shipments`

| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| GET | `/shipments/order/:orderId` | 🔐 | Rastreio do pedido. |
| GET | `/shipments` | 👑 | Lista envios. |
| POST | `/shipments` | 👑 | Cria envio. |
| PATCH | `/shipments/:id` | 👑 | Atualiza (status/rastreio). |

## Returns — `/returns`

| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| GET | `/returns` | 🔐 | Devoluções do usuário. |
| POST | `/returns` | 🔐 | Solicita devolução. |
| GET | `/returns/:id` | 🔐 | Detalhe. |
| GET | `/returns/admin/all` | 👑 | Todas as devoluções. |
| PATCH | `/returns/:id/status` | 👑 | Aprova/rejeita/reembolsa. |

## Reviews — `/reviews`

| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| GET | `/reviews` | 🔓 | Avaliações aprovadas (por produto). Query: `product_id`. |
| POST | `/reviews` | 🔐 | Cria avaliação (entra pendente). |
| GET | `/reviews/pending` | 👑 | Avaliações aguardando aprovação. |
| PATCH | `/reviews/:id/approve` | 👑 | Aprova. |
| PATCH | `/reviews/:id/reply` | 👑 | Responde como loja. |
| DELETE | `/reviews/:id` | 👑 | Remove. |

## Inventory — `/inventory` 👑

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/inventory` | Estoque (filtros: busca, sem estoque, baixo). |
| GET | `/inventory/summary` | Resumo por categoria. |
| GET | `/inventory/movements` | Histórico de movimentações. |
| POST | `/inventory/movements` | Registra movimento (`IN`/`OUT`/`ADJUSTMENT` + motivo) — único jeito de alterar quantidade. |

## Notifications — `/notifications` 🔐

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/notifications` | Lista do usuário. |
| PATCH | `/notifications/read-all` | Marca todas como lidas. |
| PATCH | `/notifications/:id/read` | Marca uma como lida. |
| DELETE | `/notifications/:id` | Remove. |

## Admin (usuários) — `/admin` 👑

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/admin/dashboard` | Métricas do dashboard. |
| GET | `/admin/users` | Lista usuários. |
| GET | `/admin/users/:id` | Detalhe. |
| PATCH | `/admin/users/:id/role` | Altera role (`USER`/`ADMIN`). |
| PATCH | `/admin/users/:id/status` | Ativa/desativa. |
| DELETE | `/admin/users/:id` | Remove. |
