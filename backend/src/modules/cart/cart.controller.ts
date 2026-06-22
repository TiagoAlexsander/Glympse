import { Request, Response } from 'express';
import { supabase } from '../../config/supabase';

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

// Retorna o session_id do header (guest) ou undefined (logado)
function getSessionId(req: Request): string | undefined {
  return req.headers['x-session-id'] as string | undefined;
}

// Busca ou cria o carrinho do usuário/guest e retorna com itens
async function getOrCreateCart(userId?: string, sessionId?: string) {
  // Monta o filtro: por user_id se logado, por session_id se guest
  const filtro = userId
    ? { user_id: userId }
    : { session_id: sessionId };

  // Tenta encontrar carrinho existente
  let query = supabase.from('carts').select('id, user_id, session_id, coupon_id');
  if (userId)    query = (query as any).eq('user_id', userId);
  else           query = (query as any).eq('session_id', sessionId);

  const { data: existing } = await (query as any).maybeSingle();

  if (existing) return existing;

  // Cria novo carrinho
  const { data: novo, error } = await supabase
    .from('carts')
    .insert(filtro as any)
    .select('id, user_id, session_id, coupon_id')
    .single();

  if (error) throw new Error(error.message);
  return novo;
}

// Busca os itens do carrinho com dados do produto/variante
async function getCartItems(cartId: number) {
  const { data: items, error } = await supabase
    .from('cart_items')
    .select(`
      id,
      quantity,
      unit_price,
      added_at,
      product_variants (
        id, sku, price, color_name, color_hex,
        products ( id, name, slug, brand,
          product_images ( url, alt_text, is_primary, sort_order )
        ),
        product_variant_attributes (
          attribute_values ( value, attributes ( name ) )
        ),
        inventory ( quantity, reserved_quantity )
      )
    `)
    .eq('cart_id', cartId)
    .order('added_at', { ascending: true });

  if (error) throw new Error(error.message);

  return (items ?? []).map(item => {
    const variant = item.product_variants as any;
    const product = variant?.products;
    const imagem  = (product?.product_images ?? [])
      .filter((i: any) => i.is_primary)
      .sort((a: any, b: any) => a.sort_order - b.sort_order)[0] ?? null;

    const atributos = (variant?.product_variant_attributes ?? []).reduce(
      (acc: Record<string, string>, pva: any) => {
        const nome  = pva.attribute_values?.attributes?.name;
        const valor = pva.attribute_values?.value;
        if (nome && valor) acc[nome] = valor;
        return acc;
      }, {}
    );

    const estoqueDisponivel = Math.max(
      0,
      (variant?.inventory?.quantity ?? 0) - (variant?.inventory?.reserved_quantity ?? 0)
    );

    return {
      id:          item.id,
      quantity:    item.quantity,
      unit_price:  item.unit_price,
      added_at:    item.added_at,
      variant: {
        id:         variant?.id,
        sku:        variant?.sku,
        price:      variant?.price,
        color_name: variant?.color_name,
        color_hex:  variant?.color_hex,
        attributes: atributos,
        stock_available: estoqueDisponivel,
      },
      product: {
        id:    product?.id,
        name:  product?.name,
        slug:  product?.slug,
        brand: product?.brand,
        image: imagem ? { url: imagem.url, alt_text: imagem.alt_text } : null,
      },
    };
  });
}

// Calcula os totais do carrinho
function calcularTotais(items: any[]) {
  const subtotal = items.reduce((acc, item) => acc + item.unit_price * item.quantity, 0);
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    total:    Math.round(subtotal * 100) / 100,
    quantity: items.reduce((acc, item) => acc + item.quantity, 0),
  };
}

// ─────────────────────────────────────────
// CONTROLLERS
// ─────────────────────────────────────────

// GET /api/cart
// Funciona logado (usa user_id) ou guest (usa x-session-id no header)
export async function getCart(req: Request, res: Response): Promise<Response> {
  const userId    = req.user?.id;
  const sessionId = getSessionId(req);

  if (!userId && !sessionId) {
    return res.status(400).json({ success: false, error: 'Informe x-session-id no header para carrinho guest.' });
  }

  try {
    const cart  = await getOrCreateCart(userId, sessionId);
    const items = await getCartItems(cart.id);

    return res.json({
      success: true,
      data: {
        cart: {
          id:         cart.id,
          coupon_id:  cart.coupon_id,
          items,
          ...calcularTotais(items),
        },
      },
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
}

// POST /api/cart/items
// Body: { variant_id, quantity }
export async function addCartItem(req: Request, res: Response): Promise<Response> {
  const userId    = req.user?.id;
  const sessionId = getSessionId(req);
  const { variant_id, quantity = 1 } = req.body;

  if (!userId && !sessionId) {
    return res.status(400).json({ success: false, error: 'Informe x-session-id no header para carrinho guest.' });
  }

  if (!variant_id) {
    return res.status(400).json({ success: false, error: 'variant_id é obrigatório.' });
  }

  const qty = Math.max(1, parseInt(quantity, 10));

  try {
    // Verifica se a variante existe e tem estoque
    const { data: variant, error: varErr } = await supabase
      .from('product_variants')
      .select('id, price, inventory ( quantity, reserved_quantity )')
      .eq('id', variant_id)
      .eq('is_active', true)
      .single();

    if (varErr || !variant) {
      return res.status(404).json({ success: false, error: 'Variante não encontrada.' });
    }

    const estoqueDisponivel = Math.max(
      0,
      ((variant.inventory as any)?.quantity ?? 0) - ((variant.inventory as any)?.reserved_quantity ?? 0)
    );

    if (estoqueDisponivel < qty) {
      return res.status(400).json({
        success: false,
        error: `Estoque insuficiente. Disponível: ${estoqueDisponivel}.`,
      });
    }

    const cart = await getOrCreateCart(userId, sessionId);

    // Verifica se o item já está no carrinho
    const { data: existingItem } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('cart_id', cart.id)
      .eq('variant_id', variant_id)
      .maybeSingle();

    if (existingItem) {
      // Incrementa a quantidade
      const novaQtd = existingItem.quantity + qty;
      if (estoqueDisponivel < novaQtd) {
        return res.status(400).json({
          success: false,
          error: `Estoque insuficiente. Você já tem ${existingItem.quantity} no carrinho. Disponível: ${estoqueDisponivel}.`,
        });
      }

      await supabase
        .from('cart_items')
        .update({ quantity: novaQtd })
        .eq('id', existingItem.id);
    } else {
      // Adiciona novo item
      await supabase.from('cart_items').insert({
        cart_id:    cart.id,
        variant_id,
        quantity:   qty,
        unit_price: (variant as any).price,
      });
    }

    const items = await getCartItems(cart.id);

    return res.status(201).json({
      success: true,
      data: {
        cart: {
          id:         cart.id,
          coupon_id:  cart.coupon_id,
          items,
          ...calcularTotais(items),
        },
      },
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
}

// PATCH /api/cart/items/:id
// Body: { quantity }
export async function updateCartItem(req: Request, res: Response): Promise<Response> {
  const userId    = req.user?.id;
  const sessionId = getSessionId(req);
  const { id }    = req.params;
  const { quantity } = req.body;

  if (!userId && !sessionId) {
    return res.status(400).json({ success: false, error: 'Informe x-session-id no header para carrinho guest.' });
  }

  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty < 1) {
    return res.status(400).json({ success: false, error: 'quantity deve ser um número maior que 0.' });
  }

  try {
    const cart = await getOrCreateCart(userId, sessionId);

    // Garante que o item pertence ao carrinho do usuário/guest
    const { data: item, error: itemErr } = await supabase
      .from('cart_items')
      .select('id, variant_id')
      .eq('id', parseInt(id, 10))
      .eq('cart_id', cart.id)
      .maybeSingle();

    if (itemErr || !item) {
      return res.status(404).json({ success: false, error: 'Item não encontrado no carrinho.' });
    }

    // Verifica estoque
    const { data: inv } = await supabase
      .from('inventory')
      .select('quantity, reserved_quantity')
      .eq('variant_id', item.variant_id)
      .maybeSingle();

    const disponivel = Math.max(0, (inv?.quantity ?? 0) - (inv?.reserved_quantity ?? 0));
    if (disponivel < qty) {
      return res.status(400).json({
        success: false,
        error: `Estoque insuficiente. Disponível: ${disponivel}.`,
      });
    }

    await supabase.from('cart_items').update({ quantity: qty }).eq('id', item.id);

    const items = await getCartItems(cart.id);

    return res.json({
      success: true,
      data: {
        cart: {
          id:         cart.id,
          coupon_id:  cart.coupon_id,
          items,
          ...calcularTotais(items),
        },
      },
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
}

// DELETE /api/cart/items/:id
export async function removeCartItem(req: Request, res: Response): Promise<Response> {
  const userId    = req.user?.id;
  const sessionId = getSessionId(req);
  const { id }    = req.params;

  if (!userId && !sessionId) {
    return res.status(400).json({ success: false, error: 'Informe x-session-id no header para carrinho guest.' });
  }

  try {
    const cart = await getOrCreateCart(userId, sessionId);

    const { data: item } = await supabase
      .from('cart_items')
      .select('id')
      .eq('id', parseInt(id, 10))
      .eq('cart_id', cart.id)
      .maybeSingle();

    if (!item) {
      return res.status(404).json({ success: false, error: 'Item não encontrado no carrinho.' });
    }

    await supabase.from('cart_items').delete().eq('id', item.id);

    const items = await getCartItems(cart.id);

    return res.json({
      success: true,
      data: {
        cart: {
          id:         cart.id,
          coupon_id:  cart.coupon_id,
          items,
          ...calcularTotais(items),
        },
      },
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
}

// DELETE /api/cart
// Esvazia o carrinho inteiro
export async function clearCart(req: Request, res: Response): Promise<Response> {
  const userId    = req.user?.id;
  const sessionId = getSessionId(req);

  if (!userId && !sessionId) {
    return res.status(400).json({ success: false, error: 'Informe x-session-id no header para carrinho guest.' });
  }

  try {
    const cart = await getOrCreateCart(userId, sessionId);
    await supabase.from('cart_items').delete().eq('cart_id', cart.id);

    return res.json({ success: true, data: { message: 'Carrinho esvaziado.' } });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
}

// POST /api/cart/merge
// Chamado logo após o login para transferir itens do carrinho guest para o do usuário
// Body: { session_id }
export async function mergeCart(req: Request, res: Response): Promise<Response> {
  const userId = req.user?.id;
  const { session_id } = req.body;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Não autorizado.' });
  }

  if (!session_id) {
    return res.status(400).json({ success: false, error: 'session_id é obrigatório.' });
  }

  try {
    // Busca carrinho guest
    const { data: guestCart } = await supabase
      .from('carts')
      .select('id')
      .eq('session_id', session_id)
      .maybeSingle();

    if (!guestCart) {
      // Nada para fazer — retorna o carrinho do usuário normalmente
      const userCart = await getOrCreateCart(userId);
      const items    = await getCartItems(userCart.id);
      return res.json({ success: true, data: { cart: { id: userCart.id, items, ...calcularTotais(items) } } });
    }

    // Busca ou cria carrinho do usuário
    const userCart = await getOrCreateCart(userId);

    // Busca itens do guest
    const { data: guestItems } = await supabase
      .from('cart_items')
      .select('variant_id, quantity, unit_price')
      .eq('cart_id', guestCart.id);

    // Para cada item guest, adiciona ou incrementa no carrinho do usuário
    for (const gItem of guestItems ?? []) {
      const { data: existing } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('cart_id', userCart.id)
        .eq('variant_id', gItem.variant_id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('cart_items')
          .update({ quantity: existing.quantity + gItem.quantity })
          .eq('id', existing.id);
      } else {
        await supabase.from('cart_items').insert({
          cart_id:    userCart.id,
          variant_id: gItem.variant_id,
          quantity:   gItem.quantity,
          unit_price: gItem.unit_price,
        });
      }
    }

    // Remove o carrinho guest
    await supabase.from('cart_items').delete().eq('cart_id', guestCart.id);
    await supabase.from('carts').delete().eq('id', guestCart.id);

    const items = await getCartItems(userCart.id);

    return res.json({
      success: true,
      data: {
        cart: {
          id:       userCart.id,
          items,
          ...calcularTotais(items),
        },
      },
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
}

// POST /api/cart/coupon
// Body: { code }
export async function applyCoupon(req: Request, res: Response): Promise<Response> {
  const userId    = req.user?.id;
  const sessionId = getSessionId(req);
  const { code }  = req.body;

  if (!userId && !sessionId) {
    return res.status(400).json({ success: false, error: 'Informe x-session-id no header para carrinho guest.' });
  }

  if (!code) {
    return res.status(400).json({ success: false, error: 'Código do cupom é obrigatório.' });
  }

  try {
    const agora = new Date().toISOString();

    // Valida o cupom
    const { data: coupon, error: couponErr } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .eq('is_active', true)
      .or(`starts_at.is.null,starts_at.lte.${agora}`)
      .or(`expires_at.is.null,expires_at.gte.${agora}`)
      .maybeSingle();

    if (couponErr || !coupon) {
      return res.status(400).json({ success: false, error: 'Cupom inválido ou expirado.' });
    }

    // Verifica limite de usos
    if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) {
      return res.status(400).json({ success: false, error: 'Cupom esgotado.' });
    }

    const cart  = await getOrCreateCart(userId, sessionId);
    const items = await getCartItems(cart.id);
    const totais = calcularTotais(items);

    // Verifica pedido mínimo
    if (coupon.min_order_amount && totais.subtotal < coupon.min_order_amount) {
      return res.status(400).json({
        success: false,
        error: `Pedido mínimo para esse cupom: R$ ${coupon.min_order_amount.toFixed(2)}.`,
      });
    }

    // Vincula cupom ao carrinho
    await supabase.from('carts').update({ coupon_id: coupon.id }).eq('id', cart.id);

    // Calcula desconto
    let desconto = 0;
    if (coupon.type === 'PERCENTAGE') {
      desconto = totais.subtotal * (coupon.value / 100);
      if (coupon.max_discount_amount) desconto = Math.min(desconto, coupon.max_discount_amount);
    } else if (coupon.type === 'FIXED_AMOUNT') {
      desconto = Math.min(coupon.value, totais.subtotal);
    }
    desconto = Math.round(desconto * 100) / 100;

    return res.json({
      success: true,
      data: {
        cart: {
          id:            cart.id,
          coupon_id:     coupon.id,
          coupon_code:   coupon.code,
          coupon_type:   coupon.type,
          items,
          subtotal:      totais.subtotal,
          discount:      desconto,
          total:         Math.round((totais.subtotal - desconto) * 100) / 100,
          quantity:      totais.quantity,
        },
      },
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
}

// DELETE /api/cart/coupon
// Remove o cupom do carrinho
export async function removeCoupon(req: Request, res: Response): Promise<Response> {
  const userId    = req.user?.id;
  const sessionId = getSessionId(req);

  if (!userId && !sessionId) {
    return res.status(400).json({ success: false, error: 'Informe x-session-id no header para carrinho guest.' });
  }

  try {
    const cart = await getOrCreateCart(userId, sessionId);
    await supabase.from('carts').update({ coupon_id: null }).eq('id', cart.id);
    const items = await getCartItems(cart.id);

    return res.json({
      success: true,
      data: { cart: { id: cart.id, coupon_id: null, items, ...calcularTotais(items) } },
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
}
