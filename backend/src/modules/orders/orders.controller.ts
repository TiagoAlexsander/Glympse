import { Request, Response } from 'express';
import { supabase } from '../../config/supabase';
import { criarNotificacao } from '../notifications/notifications.controller';

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

// Gera número de pedido único: GLY-20260609-XXXX
function gerarNumeroPedido(): string {
  const data = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `GLY-${data}-${rand}`;
}

// ─────────────────────────────────────────
// POST /api/orders — Criar pedido (checkout)
// Body: { address_id, shipping_method_id, coupon_code? }
// ─────────────────────────────────────────
export async function createOrder(req: Request, res: Response): Promise<Response> {
  const userId = req.user!.id;
  const { address_id, shipping_method_id, coupon_code } = req.body;

  if (!address_id || !shipping_method_id) {
    return res.status(400).json({
      success: false,
      error: 'Endereço e método de frete são obrigatórios.',
    });
  }

  // 1. Busca o carrinho do usuário com itens
  const { data: cart } = await supabase
    .from('carts')
    .select('id, coupon_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!cart) {
    return res.status(400).json({ success: false, error: 'Carrinho não encontrado.' });
  }

  const { data: cartItems } = await supabase
    .from('cart_items')
    .select(`
      id, quantity, unit_price, variant_id,
      product_variants (
        id, sku, price, is_active,
        products ( id, name, slug, product_images ( url, is_primary ) ),
        product_variant_attributes (
          attribute_values ( value, attributes ( name ) )
        ),
        inventory ( quantity, reserved_quantity )
      )
    `)
    .eq('cart_id', cart.id);

  if (!cartItems?.length) {
    return res.status(400).json({ success: false, error: 'Carrinho vazio.' });
  }

  // 2. Valida estoque de cada item
  for (const item of cartItems) {
    const variant = item.product_variants as any;
    const disponivel = Math.max(
      0,
      (variant?.inventory?.quantity ?? 0) - (variant?.inventory?.reserved_quantity ?? 0)
    );
    if (disponivel < item.quantity) {
      return res.status(400).json({
        success: false,
        error: `Estoque insuficiente para "${(variant?.products as any)?.name}". Disponível: ${disponivel}.`,
      });
    }
    if (!variant?.is_active) {
      return res.status(400).json({
        success: false,
        error: `Variante "${variant?.sku}" não está mais disponível.`,
      });
    }
  }

  // 3. Valida endereço (deve pertencer ao usuário)
  const { data: address } = await supabase
    .from('addresses')
    .select('*')
    .eq('id', parseInt(address_id, 10))
    .eq('user_id', userId)
    .maybeSingle();

  if (!address) {
    return res.status(400).json({ success: false, error: 'Endereço não encontrado.' });
  }

  // 4. Valida método de frete
  const { data: shippingMethod } = await supabase
    .from('shipping_methods')
    .select('*')
    .eq('id', parseInt(shipping_method_id, 10))
    .eq('is_active', true)
    .maybeSingle();

  if (!shippingMethod) {
    return res.status(400).json({ success: false, error: 'Método de frete inválido.' });
  }

  // 5. Calcula subtotal
  const subtotal = cartItems.reduce((acc, item) => acc + item.unit_price * item.quantity, 0);

  // 6. Aplica frete (grátis acima de um valor, se configurado)
  const shippingCost = shippingMethod.free_above && subtotal >= shippingMethod.free_above
    ? 0
    : (shippingMethod.price ?? 0);

  // 7. Aplica cupom se houver
  let descontoValor = 0;
  let couponId: number | null = cart.coupon_id;

  if (coupon_code || couponId) {
    const agora = new Date().toISOString();
    let couponQuery = supabase.from('coupons').select('*').eq('is_active', true)
      .or(`starts_at.is.null,starts_at.lte.${agora}`)
      .or(`expires_at.is.null,expires_at.gte.${agora}`);

    if (coupon_code) {
      couponQuery = couponQuery.eq('code', coupon_code.toUpperCase().trim());
    } else {
      couponQuery = couponQuery.eq('id', couponId!);
    }

    const { data: coupon } = await couponQuery.maybeSingle();

    if (coupon) {
      // Valida limite total de usos do cupom
      if (coupon.max_uses != null && (coupon.uses_count ?? 0) >= coupon.max_uses) {
        return res.status(400).json({ success: false, error: 'Este cupom já atingiu o limite de usos.' });
      }
      // Valida limite por usuário
      if (coupon.max_uses_per_user != null) {
        const { count: usosDoUsuario } = await supabase
          .from('coupon_usages')
          .select('id', { count: 'exact', head: true })
          .eq('coupon_id', coupon.id)
          .eq('user_id', userId);
        if ((usosDoUsuario ?? 0) >= coupon.max_uses_per_user) {
          return res.status(400).json({ success: false, error: 'Você já usou este cupom o número máximo de vezes.' });
        }
      }
      // Valida pedido mínimo
      if (coupon.min_order_amount != null && subtotal < coupon.min_order_amount) {
        return res.status(400).json({ success: false, error: `Pedido mínimo para este cupom: R$ ${coupon.min_order_amount.toFixed(2)}.` });
      }
      couponId = coupon.id;
      if (coupon.type === 'PERCENTAGE') {
        descontoValor = subtotal * (coupon.value / 100);
        if (coupon.max_discount_amount) descontoValor = Math.min(descontoValor, coupon.max_discount_amount);
      } else if (coupon.type === 'FIXED_AMOUNT') {
        descontoValor = Math.min(coupon.value, subtotal);
      } else if (coupon.type === 'FREE_SHIPPING') {
        descontoValor = shippingCost;
      }
    }
  }

  const total = Math.max(0, subtotal - descontoValor + shippingCost);

  // 8a. Reserva de estoque ATÔMICA (antes de criar o pedido, evita overselling).
  // Usa a função SQL reservar_carrinho (ver backend/sql/atomic-stock.sql).
  // Se a função ainda não existir no banco, cai no método manual (passo 12).
  let reservadoViaRpc = false;
  const itemsPayload = cartItems.map(i => ({ variant_id: i.variant_id, quantity: i.quantity }));
  const { data: rpcOk, error: rpcErr } = await (supabase as any).rpc('reservar_carrinho', { p_items: itemsPayload });

  if (rpcErr) {
    // Função inexistente (PGRST202 / 42883) → segue com reserva manual no passo 12
    const ausente = rpcErr.code === 'PGRST202' || rpcErr.code === '42883' || /function|not exist|schema cache/i.test(rpcErr.message);
    if (!ausente) {
      return res.status(400).json({ success: false, error: 'Erro ao reservar estoque. Tente novamente.' });
    }
  } else if (rpcOk === false) {
    return res.status(400).json({ success: false, error: 'Estoque insuficiente para um ou mais itens do carrinho.' });
  } else {
    reservadoViaRpc = true; // reserva já feita atomicamente
  }

  // 8. Snapshot do endereço (guarda os dados no momento do pedido)
  const shippingSnapshot = {
    label:          address.label,
    recipient_name: address.recipient_name,
    street:         address.street,
    number:         address.number,
    complement:     address.complement,
    neighborhood:   address.neighborhood,
    city:           address.city,
    state:          address.state,
    zip_code:       address.zip_code,
    country:        address.country,
    phone_number:   address.phone_number,
  };

  // 9. Cria o pedido
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id:                   userId,
      address_id:                parseInt(address_id, 10),
      shipping_address_snapshot: shippingSnapshot,
      coupon_id:                 couponId,
      order_number:              gerarNumeroPedido(),
      status:                    'PENDING',
      payment_status:            'PENDING',
      delivery_status:           'PENDING',
      subtotal:                  Math.round(subtotal * 100) / 100,
      discount_amount:           Math.round(descontoValor * 100) / 100,
      shipping_cost:             Math.round(shippingCost * 100) / 100,
      total:                     Math.round(total * 100) / 100,
    })
    .select('*')
    .single();

  if (orderError || !order) {
    return res.status(400).json({ success: false, error: orderError?.message ?? 'Erro ao criar pedido.' });
  }

  // 10. Cria os itens do pedido
  const orderItems = cartItems.map(item => {
    const variant = item.product_variants as any;
    const product = variant?.products as any;
    const imagem  = (product?.product_images ?? []).find((i: any) => i.is_primary)?.url ?? null;
    const atributos = (variant?.product_variant_attributes ?? []).reduce(
      (acc: Record<string, string>, pva: any) => {
        const nome  = pva.attribute_values?.attributes?.name;
        const valor = pva.attribute_values?.value;
        if (nome && valor) acc[nome] = valor;
        return acc;
      }, {}
    );

    return {
      order_id:           order.id,
      variant_id:         item.variant_id,
      product_name:       product?.name ?? '',
      variant_sku:        variant?.sku ?? '',
      variant_attributes: atributos,
      product_image_url:  imagem,
      quantity:           item.quantity,
      unit_price:         item.unit_price,
      total_price:        Math.round(item.unit_price * item.quantity * 100) / 100,
    };
  });

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
  if (itemsError) {
    // Rollback manual — remove o pedido criado
    await supabase.from('orders').delete().eq('id', order.id);
    return res.status(400).json({ success: false, error: itemsError.message });
  }

  // 11. Registra histórico de status
  await supabase.from('order_status_history').insert({
    order_id: order.id,
    status:   'PENDING',
    notes:    'Pedido criado via checkout.',
  });

  // 12. Reserva o estoque manualmente — SÓ se a reserva atômica (8a) não rodou
  if (!reservadoViaRpc) {
    for (const item of cartItems) {
      const variant = item.product_variants as any;
      const { data: inv } = await supabase
        .from('inventory')
        .select('reserved_quantity')
        .eq('variant_id', variant.id)
        .maybeSingle();

      if (inv) {
        await supabase
          .from('inventory')
          .update({ reserved_quantity: inv.reserved_quantity + item.quantity })
          .eq('variant_id', variant.id);
      }
    }
  }

  // 13. Registra uso do cupom se houver
  if (couponId) {
    await supabase.from('coupon_usages').insert({
      coupon_id: couponId,
      user_id:   userId,
      order_id:  order.id,
    });

    // Incrementa contador de usos do cupom
    const { data: couponAtual } = await supabase
      .from('coupons')
      .select('uses_count')
      .eq('id', couponId)
      .maybeSingle();

    if (couponAtual) {
      await supabase
        .from('coupons')
        .update({ uses_count: (couponAtual.uses_count ?? 0) + 1 })
        .eq('id', couponId);
    }
  }

  // 14. Limpa o carrinho
  await supabase.from('cart_items').delete().eq('cart_id', cart.id);
  await supabase.from('carts').update({ coupon_id: null }).eq('id', cart.id);

  return res.status(201).json({
    success: true,
    data: {
      order: {
        ...order,
        items: orderItems,
      },
    },
  });
}

// ─────────────────────────────────────────
// GET /api/orders — Lista pedidos do usuário
// ─────────────────────────────────────────
export async function listOrders(req: Request, res: Response): Promise<Response> {
  const userId = req.user!.id;
  const page   = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit  = Math.min(50, parseInt(req.query.limit as string) || 10);
  const offset = (page - 1) * limit;

  const { data: orders, error, count } = await supabase
    .from('orders')
    .select(`
      id, order_number, status, payment_status, delivery_status,
      subtotal, discount_amount, shipping_cost, total,
      created_at,
      order_items ( id, product_name, product_image_url, quantity, unit_price, total_price, variant_attributes ),
      returns ( id, status )
    `, { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  return res.json({
    success: true,
    data: { orders },
    pagination: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) },
  });
}

// ─────────────────────────────────────────
// GET /api/orders/:id — Detalhe de um pedido
// ─────────────────────────────────────────
export async function getOrderById(req: Request, res: Response): Promise<Response> {
  const userId = req.user!.id;
  const { id } = req.params;

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items ( *, product_variants ( products ( slug ) ) ),
      order_status_history ( status, notes, created_at ),
      returns ( id, status, reason, notes, refund_amount, created_at, updated_at )
    `)
    .eq('id', parseInt(id, 10))
    .eq('user_id', userId)
    .single();

  if (error || !order) {
    return res.status(404).json({ success: false, error: 'Pedido não encontrado.' });
  }

  // Anexa o slug do produto em cada item (para link no frontend)
  const orderComSlug = {
    ...order,
    order_items: (order.order_items as any[]).map(it => ({
      ...it,
      product_slug: it.product_variants?.products?.slug ?? null,
    })),
  };

  return res.json({ success: true, data: { order: orderComSlug } });
}

// ═════════════════════════════════════════════════════════════════════════════
// ROTAS ADMIN — gerenciamento de pedidos pelo painel
// ═════════════════════════════════════════════════════════════════════════════

// GET /api/orders/admin/all — Lista TODOS os pedidos (admin)
// Query: ?page=1&limit=20&status=PENDING&search=GLY-2026
export async function listAllOrders(req: Request, res: Response): Promise<Response> {
  const page   = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit  = Math.min(100, parseInt(req.query.limit as string) || 20);
  const offset = (page - 1) * limit;
  const status = req.query.status as string | undefined;
  const search = req.query.search as string | undefined;

  let query = supabase
    .from('orders')
    .select(`
      id, order_number, status, payment_status, delivery_status,
      subtotal, shipping_cost, total, created_at,
      users ( first_name, last_name, display_name ),
      order_items ( id )
    `, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status as any);
  if (search) query = query.ilike('order_number', `%${search}%`);

  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error) return res.status(400).json({ success: false, error: error.message });

  return res.json({
    success: true,
    data: { orders: data },
    pagination: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) },
  });
}

// GET /api/orders/admin/:id — Detalhe completo de um pedido (admin, qualquer dono)
export async function getOrderByIdAdmin(req: Request, res: Response): Promise<Response> {
  const { id } = req.params;

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      users ( first_name, last_name, display_name, phone ),
      order_items ( *, product_variants ( products ( slug ) ) ),
      order_status_history ( status, notes, created_at ),
      returns ( id, status, reason, notes, refund_amount, created_at ),
      shipments ( id, carrier, tracking_code, tracking_url, status, shipped_at, delivered_at )
    `)
    .eq('id', parseInt(id, 10))
    .single();

  if (error || !order) {
    return res.status(404).json({ success: false, error: 'Pedido não encontrado.' });
  }

  const orderComSlug = {
    ...order,
    order_items: (order.order_items as any[]).map(it => ({
      ...it,
      product_slug: it.product_variants?.products?.slug ?? null,
    })),
  };

  return res.json({ success: true, data: { order: orderComSlug } });
}

// PATCH /api/orders/admin/:id/status — Muda o status do pedido (admin)
// Body: { status, notes? }
export async function updateOrderStatus(req: Request, res: Response): Promise<Response> {
  const adminId = req.user!.id;
  const { id }  = req.params;
  const { status, notes } = req.body;

  const statusValidos = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
  if (!statusValidos.includes(status)) {
    return res.status(400).json({ success: false, error: `Status inválido. Válidos: ${statusValidos.join(', ')}` });
  }

  const orderId = parseInt(id, 10);

  const { data: order, error } = await supabase
    .from('orders')
    .update({ status } as any)
    .eq('id', orderId)
    .select('id, user_id, order_number, status')
    .single();

  if (error || !order) {
    return res.status(404).json({ success: false, error: 'Pedido não encontrado.' });
  }

  // Registra no histórico
  await supabase.from('order_status_history').insert({
    order_id:   orderId,
    status:     status as any,
    changed_by: adminId,
    notes:      notes ?? `Status alterado para ${status} pelo administrador.`,
  });

  // Notifica o cliente sobre mudanças relevantes
  const notifs: Record<string, { tipo: any; titulo: string; msg: string }> = {
    CONFIRMED:  { tipo: 'ORDER_CONFIRMED', titulo: 'Pedido confirmado',  msg: `Seu pedido ${order.order_number} foi confirmado.` },
    PROCESSING: { tipo: 'SYSTEM',          titulo: 'Pedido em separação', msg: `Seu pedido ${order.order_number} está sendo preparado.` },
    SHIPPED:    { tipo: 'ORDER_SHIPPED',   titulo: 'Pedido enviado 📦',   msg: `Seu pedido ${order.order_number} foi enviado.` },
    DELIVERED:  { tipo: 'ORDER_DELIVERED', titulo: 'Pedido entregue ✓',   msg: `Seu pedido ${order.order_number} foi entregue.` },
    CANCELLED:  { tipo: 'ORDER_CANCELLED', titulo: 'Pedido cancelado',    msg: `Seu pedido ${order.order_number} foi cancelado.` },
  };
  const n = notifs[status];
  if (n) {
    await criarNotificacao(order.user_id, n.tipo, n.titulo, n.msg, { order_id: orderId });
  }

  return res.json({ success: true, data: { order } });
}

// ─────────────────────────────────────────
// GET /api/orders/:id/shipping-methods
// Retorna métodos de frete disponíveis com cálculo de frete grátis
// ─────────────────────────────────────────
export async function listShippingMethods(req: Request, res: Response): Promise<Response> {
  const userId = req.user!.id;

  // Pega subtotal atual do carrinho para calcular frete grátis
  const { data: cart } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  let subtotal = 0;
  if (cart) {
    const { data: items } = await supabase
      .from('cart_items')
      .select('quantity, unit_price')
      .eq('cart_id', cart.id);
    subtotal = (items ?? []).reduce((acc, i) => acc + i.unit_price * i.quantity, 0);
  }

  const { data: methods, error } = await supabase
    .from('shipping_methods')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true });

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  // Marca frete grátis quando subtotal >= free_above
  const metodos = (methods ?? []).map(m => ({
    ...m,
    effective_price: m.free_above && subtotal >= m.free_above ? 0 : m.price,
    is_free:         m.free_above ? subtotal >= m.free_above : false,
  }));

  return res.json({ success: true, data: { shipping_methods: metodos, subtotal } });
}

// ─────────────────────────────────────────
// PATCH /api/orders/:id/cancel — Cliente cancela o próprio pedido
// Só permitido enquanto PENDING ou CONFIRMED (ainda não enviado)
// ─────────────────────────────────────────
export async function cancelOrder(req: Request, res: Response): Promise<Response> {
  const userId = req.user!.id;
  const orderId = parseInt(req.params.id, 10);

  const { data: order } = await supabase
    .from('orders')
    .select('id, status, payment_status, order_number')
    .eq('id', orderId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!order) return res.status(404).json({ success: false, error: 'Pedido não encontrado.' });

  if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
    return res.status(400).json({
      success: false,
      error: 'Só é possível cancelar pedidos que ainda não foram enviados.',
    });
  }

  // Atualiza status
  await supabase
    .from('orders')
    .update({ status: 'CANCELLED', payment_status: order.payment_status === 'PAID' ? 'REFUNDED' : 'CANCELLED' } as any)
    .eq('id', orderId);

  await supabase.from('order_status_history').insert({
    order_id:   orderId,
    status:     'CANCELLED' as any,
    changed_by: userId,
    notes:      'Pedido cancelado pelo cliente.',
  });

  // Devolve o estoque (reservado se não pago; quantidade real se já pago)
  const { data: items } = await supabase
    .from('order_items')
    .select('variant_id, quantity')
    .eq('order_id', orderId);

  for (const item of items ?? []) {
    const { data: inv } = await supabase
      .from('inventory')
      .select('quantity, reserved_quantity')
      .eq('variant_id', item.variant_id)
      .maybeSingle();

    if (inv) {
      if (order.payment_status === 'PAID') {
        // Já havia saído do estoque — devolve a quantidade
        await supabase.from('inventory')
          .update({ quantity: inv.quantity + item.quantity })
          .eq('variant_id', item.variant_id);
      } else {
        // Só estava reservado — libera a reserva
        await supabase.from('inventory')
          .update({ reserved_quantity: Math.max(0, inv.reserved_quantity - item.quantity) })
          .eq('variant_id', item.variant_id);
      }
    }
  }

  await criarNotificacao(userId, 'ORDER_CANCELLED', 'Pedido cancelado',
    `Seu pedido ${order.order_number} foi cancelado com sucesso.`, { order_id: orderId });

  return res.json({ success: true, data: { message: 'Pedido cancelado.' } });
}
