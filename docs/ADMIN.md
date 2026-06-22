# Manual do Admin — Glympse

Guia prático para operar a loja pelo **Painel Admin**, sem precisar de Postman ou conhecimento técnico. Tudo é feito pela interface.

## Entrar no painel

1. Faça login com uma conta de **administrador**.
   > Para tornar uma conta admin, alguém com acesso ao servidor roda: `npx ts-node src/scripts/make-admin.ts <seu-email>` (ver [SETUP.md](SETUP.md#6-criar-um-administrador)).
2. Clique em **Painel Admin** na barra de navegação. Você cai no **Dashboard**.

O painel tem menu lateral com: **Dashboard, Pedidos, Produtos, Estoque, Devoluções, Avaliações, Usuários**.

Dica: o botão de **tema claro/escuro** (sol/lua) na barra superior funciona em todo o painel.

---

## Dashboard
Visão geral da loja: total de pedidos, faturamento, itens com estoque baixo e atalhos. É só leitura.

## Pedidos
Lista todos os pedidos (com paginação). Clique em um pedido para abrir o detalhe, onde você pode:
- Ver itens, valores, endereço e dados do cliente.
- **Alterar o status** do pedido (ex: Confirmado → Processando → Enviado → Entregue).
- Acompanhar pagamento e entrega.

## Produtos (Catálogo)
A página **Produtos** reúne 3 abas: **Produtos**, **Categorias** e **Coleções**.

### Aba Produtos
- **+ Novo produto**: cria um produto, escolhe os tamanhos (por botões) e define preço. O produto nasce com **estoque 0** — a quantidade é ajustada depois na aba **Estoque**.
- Clique em um produto para **editar**. Na tela de edição você ajusta nome, preço, categoria, destaque, coleções e tamanhos.
  > A edição usa **staging**: adicionar/remover tamanho e mudar preços só valem quando você clica em **Salvar tudo**. Nada é salvo até apertar o botão.
- **Preço "de" (riscado)**: preencha o *compare price* maior que o preço atual para mostrar desconto na loja.
- **Destaque**: marca o produto para aparecer na vitrine da home (marketing — não afeta estoque).
- Remover um tamanho que **nunca teve pedido** o apaga; se já teve pedido, ele é apenas **desativado** (some da loja, histórico preservado).

### Aba Categorias
CRUD de categorias (criar, renomear, ativar/desativar). Categorias organizam o catálogo e aparecem nos filtros da loja.

### Aba Coleções
- Crie coleções e marque como **visível/oculta** (visível = aparece na loja). Coleção nunca é apagada de verdade, só ocultada — os produtos são preservados.
- **Expanda** uma coleção para gerenciar produtos **ali mesmo**: busque e adicione/remova produtos sem sair da página.
- Também dá para vincular coleções pelo lado do produto (na edição do produto, via checkboxes).

## Estoque
Este é o **único lugar** que altera a quantidade em estoque — sempre com um movimento registrado (auditoria).
- **Resumo por categoria** (expansível) e filtros: busca, "sem estoque", "estoque baixo".
- **Editar estoque** (modal): você informa o tipo de movimento — **Entrada** (`IN`), **Saída** (`OUT`) ou **Ajuste** (`ADJUSTMENT`) — e o **motivo**. Um único botão **Salvar alterações de estoque** aplica tudo.
- Aba de **histórico de movimentações**: lista tudo que entrou/saiu, com motivo e data.

> A edição de produto **não** mexe em estoque — só preço/tamanhos. Isso é proposital: estoque vive na aba Estoque, com rastro de auditoria.

## Devoluções
Lista as solicitações de devolução dos clientes. Em cada uma você pode **aprovar, rejeitar, marcar como recebida ou reembolsar**. A tela mostra o valor dos itens e o total do pedido; o valor de reembolso já vem sugerido com o valor dos itens.

## Avaliações
Avaliações de clientes entram **pendentes**. Aqui você pode:
- **Aprovar** (passa a aparecer na página do produto),
- **Responder** como loja,
- **Remover**.

## Usuários
Lista de usuários cadastrados. Você pode **promover/rebaixar** (USER ↔ ADMIN), **ativar/desativar** e remover contas.

---

## Perguntas frequentes

**Criei um produto mas ele não aparece com estoque.**
Produtos nascem com estoque 0. Vá em **Estoque → Editar estoque** e registre uma **Entrada** com a quantidade.

**Mudei o preço/tamanhos mas não salvou.**
Na edição de produto, as mudanças só valem ao clicar em **Salvar tudo**. Confira se apertou o botão.

**Quero esconder uma coleção sem perder os produtos.**
Use **Ocultar** na aba Coleções. Os produtos continuam intactos; a coleção só some da loja.

**Por que não consigo mudar a quantidade na tela do produto?**
Por design: estoque só muda na aba **Estoque**, sempre com motivo registrado (para auditoria).
