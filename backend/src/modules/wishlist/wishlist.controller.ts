import { Request, Response } from 'express';
import { supabase } from '../../config/supabase';

// GET /api/wishlist
// Retorna os itens da wishlist do usuário logado
export async function getWishlist(req: Request, res: Response): Promise<Response> {
  const userId = req.user!.id;

  // Busca ou cria a wishlist padrão do usuário
  let { data: wishlist } = await supabase
    .from('wishlists')
    .select('id')
    .eq('user_id', userId)
    .eq('name', 'Favoritos')
    .maybeSingle();

  if (!wishlist) {
    const { data: nova } = await supabase
      .from('wishlists')
      .insert({ user_id: userId, name: 'Favoritos', is_public: false })
      .select('id')
      .single();
    wishlist = nova!;
  }

  const { data: items, error } = await supabase
    .from('wishlist_items')
    .select(`
      id,
      added_at,
      product_variants (
        id, sku, price, color_name,
        products (
          id, name, slug, brand, base_price, compare_price,
          product_images ( url, alt_text, is_primary, sort_order )
        ),
        inventory ( quantity, reserved_quantity )
      )
    `)
    .eq('wishlist_id', wishlist.id)
    .order('added_at', { ascending: false });

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  const lista = (items ?? []).map(item => {
    const variant = item.product_variants as any;
    const product = variant?.products;
    const imagem  = (product?.product_images ?? [])
      .filter((i: any) => i.is_primary)
      .sort((a: any, b: any) => a.sort_order - b.sort_order)[0] ?? null;

    return {
      id:       item.id,
      added_at: item.added_at,
      variant: { id: variant?.id, sku: variant?.sku, price: variant?.price },
      product: {
        id:            product?.id,
        name:          product?.name,
        slug:          product?.slug,
        brand:         product?.brand,
        base_price:    product?.base_price,
        compare_price: product?.compare_price,
        image:         imagem ? { url: imagem.url, alt_text: imagem.alt_text } : null,
      },
    };
  });

  return res.json({ success: true, data: { wishlist_id: wishlist.id, items: lista } });
}

// POST /api/wishlist/items
// Body: { variant_id }
export async function addWishlistItem(req: Request, res: Response): Promise<Response> {
  const userId       = req.user!.id;
  const { variant_id } = req.body;

  if (!variant_id) {
    return res.status(400).json({ success: false, error: 'variant_id é obrigatório.' });
  }

  // Garante que a wishlist padrão existe
  let { data: wishlist } = await supabase
    .from('wishlists')
    .select('id')
    .eq('user_id', userId)
    .eq('name', 'Favoritos')
    .maybeSingle();

  if (!wishlist) {
    const { data: nova } = await supabase
      .from('wishlists')
      .insert({ user_id: userId, name: 'Favoritos', is_public: false })
      .select('id')
      .single();
    wishlist = nova!;
  }

  // Verifica se já está na wishlist
  const { data: existing } = await supabase
    .from('wishlist_items')
    .select('id')
    .eq('wishlist_id', wishlist.id)
    .eq('variant_id', variant_id)
    .maybeSingle();

  if (existing) {
    return res.status(400).json({ success: false, error: 'Item já está na wishlist.' });
  }

  const { data: item, error } = await supabase
    .from('wishlist_items')
    .insert({ wishlist_id: wishlist.id, variant_id })
    .select('id, added_at')
    .single();

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  return res.status(201).json({ success: true, data: { item } });
}

// DELETE /api/wishlist/items/:variantId
// Remove da wishlist pelo variant_id (mais fácil de usar no frontend)
export async function removeWishlistItem(req: Request, res: Response): Promise<Response> {
  const userId    = req.user!.id;
  const variantId = parseInt(req.params.variantId, 10);

  const { data: wishlist } = await supabase
    .from('wishlists')
    .select('id')
    .eq('user_id', userId)
    .eq('name', 'Favoritos')
    .maybeSingle();

  if (!wishlist) {
    return res.status(404).json({ success: false, error: 'Wishlist não encontrada.' });
  }

  const { error } = await supabase
    .from('wishlist_items')
    .delete()
    .eq('wishlist_id', wishlist.id)
    .eq('variant_id', variantId);

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  return res.json({ success: true, data: { message: 'Item removido da wishlist.' } });
}

// GET /api/wishlist/ids
// Retorna só os variant_ids na wishlist — útil para marcar o coração nos cards
export async function getWishlistIds(req: Request, res: Response): Promise<Response> {
  const userId = req.user!.id;

  const { data: wishlist } = await supabase
    .from('wishlists')
    .select('id')
    .eq('user_id', userId)
    .eq('name', 'Favoritos')
    .maybeSingle();

  if (!wishlist) {
    return res.json({ success: true, data: { variant_ids: [] } });
  }

  const { data: items } = await supabase
    .from('wishlist_items')
    .select('variant_id')
    .eq('wishlist_id', wishlist.id);

  return res.json({
    success: true,
    data: { variant_ids: (items ?? []).map(i => i.variant_id) },
  });
}
