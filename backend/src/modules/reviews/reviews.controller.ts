import { Request, Response } from 'express';
import { supabase } from '../../config/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reviews?product_id=X — Lista reviews aprovados de um produto
// ─────────────────────────────────────────────────────────────────────────────
export async function listReviews(req: Request, res: Response): Promise<Response> {
  const productId = req.query.product_id ? parseInt(req.query.product_id as string, 10) : null;
  const page      = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit     = Math.min(50, parseInt(req.query.limit as string) || 10);
  const offset    = (page - 1) * limit;

  if (!productId) return res.status(400).json({ success: false, error: 'product_id é obrigatório.' });

  const { data, error, count } = await supabase
    .from('reviews')
    .select(`
      id, rating, title, body, verified_purchase,
      owner_reply, owner_reply_at, created_at,
      users!reviews_user_id_fkey ( display_name, first_name, avatar_url ),
      review_images ( url, sort_order )
    `, { count: 'exact' })
    .eq('product_id', productId)
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return res.status(400).json({ success: false, error: error.message });

  // Calcula média de rating
  const { data: stats } = await supabase
    .from('reviews')
    .select('rating')
    .eq('product_id', productId)
    .eq('is_approved', true);

  const total_reviews = stats?.length ?? 0;
  const avg_rating    = total_reviews > 0
    ? stats!.reduce((a, r) => a + r.rating, 0) / total_reviews
    : 0;

  const reviews = (data ?? []).map(r => ({
    id:               r.id,
    rating:           r.rating,
    title:            r.title,
    body:             r.body,
    verified_purchase: r.verified_purchase,
    owner_reply:      r.owner_reply,
    owner_reply_at:   r.owner_reply_at,
    created_at:       r.created_at,
    author:           (r.users as any)?.display_name ?? (r.users as any)?.first_name ?? 'Anônimo',
    avatar_url:       (r.users as any)?.avatar_url ?? null,
    images:           (r.review_images as any[] ?? [])
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map((i: any) => i.url),
  }));

  return res.json({
    success: true,
    data: {
      reviews,
      stats: {
        total:      total_reviews,
        avg_rating: Math.round(avg_rating * 10) / 10,
      },
    },
    pagination: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/reviews — Criar review (usuário logado)
// Body: { product_id, rating, title?, body?, order_item_id? }
// ─────────────────────────────────────────────────────────────────────────────
export async function createReview(req: Request, res: Response): Promise<Response> {
  const userId = req.user!.id;
  const { product_id, rating, title, body, order_item_id } = req.body;

  if (!product_id || !rating) {
    return res.status(400).json({ success: false, error: 'product_id e rating são obrigatórios.' });
  }

  const nota = parseInt(rating, 10);
  if (nota < 1 || nota > 5) {
    return res.status(400).json({ success: false, error: 'rating deve ser entre 1 e 5.' });
  }

  // Verifica se já avaliou esse produto
  const { data: existente } = await supabase
    .from('reviews')
    .select('id')
    .eq('product_id', parseInt(product_id, 10))
    .eq('user_id', userId)
    .maybeSingle();

  if (existente) {
    return res.status(400).json({ success: false, error: 'Você já avaliou este produto.' });
  }

  // Verifica se é compra confirmada (verified_purchase)
  let verifiedPurchase = false;
  if (order_item_id) {
    const { data: orderItem } = await supabase
      .from('order_items')
      .select('id, orders ( user_id, status )')
      .eq('id', parseInt(order_item_id, 10))
      .maybeSingle();

    const orderUserId = (orderItem?.orders as any)?.user_id;
    const orderStatus = (orderItem?.orders as any)?.status;
    verifiedPurchase  = orderUserId === userId && orderStatus === 'DELIVERED';
  } else {
    // Busca pedidos entregues do usuário e verifica se algum contém o produto
    const { data: pedidosEntregues } = await supabase
      .from('orders')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'DELIVERED')
      .limit(50);

    if (pedidosEntregues?.length) {
      const orderIds = pedidosEntregues.map(p => p.id);

      // Busca order_items desses pedidos que correspondem ao produto via variante
      const { data: variantesProduto } = await supabase
        .from('product_variants')
        .select('id')
        .eq('product_id', parseInt(product_id, 10));

      if (variantesProduto?.length) {
        const variantIds = variantesProduto.map(v => v.id);
        const { data: itemComprado } = await supabase
          .from('order_items')
          .select('id')
          .in('order_id', orderIds)
          .in('variant_id', variantIds)
          .limit(1)
          .maybeSingle();

        verifiedPurchase = !!itemComprado;
      }
    }
  }

  const { data: review, error } = await supabase
    .from('reviews')
    .insert({
      product_id:        parseInt(product_id, 10),
      user_id:           userId,
      order_item_id:     order_item_id ? parseInt(order_item_id, 10) : null,
      rating:            nota,
      title:             title ?? null,
      body:              body ?? null,
      is_approved:       false, // Aguarda aprovação do admin
      verified_purchase: verifiedPurchase,
    })
    .select('id, rating, title, body, created_at')
    .single();

  if (error) return res.status(400).json({ success: false, error: error.message });

  return res.status(201).json({
    success: true,
    data: {
      review,
      message: 'Avaliação enviada! Será publicada após aprovação.',
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reviews/pending — Lista reviews pendentes de aprovação (admin)
// ─────────────────────────────────────────────────────────────────────────────
export async function listPendingReviews(req: Request, res: Response): Promise<Response> {
  const page   = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit  = Math.min(50, parseInt(req.query.limit as string) || 20);
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('reviews')
    .select(`
      id, rating, title, body, verified_purchase, owner_reply, created_at,
      users!reviews_user_id_fkey ( display_name, first_name ),
      products ( id, name, slug )
    `, { count: 'exact' })
    .eq('is_approved', false)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) return res.status(400).json({ success: false, error: error.message });

  return res.json({
    success: true,
    data: { reviews: data },
    pagination: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/reviews/:id/approve — Aprovar review (admin)
// ─────────────────────────────────────────────────────────────────────────────
export async function approveReview(req: Request, res: Response): Promise<Response> {
  const adminId  = req.user!.id;
  const reviewId = parseInt(req.params.id, 10);

  const { error } = await supabase
    .from('reviews')
    .update({
      is_approved:  true,
      approved_by:  adminId,
      approved_at:  new Date().toISOString(),
    })
    .eq('id', reviewId);

  if (error) return res.status(400).json({ success: false, error: error.message });

  return res.json({ success: true, data: { message: 'Review aprovado.' } });
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/reviews/:id — Rejeitar/deletar review (admin)
// ─────────────────────────────────────────────────────────────────────────────
export async function deleteReview(req: Request, res: Response): Promise<Response> {
  const reviewId = parseInt(req.params.id, 10);

  const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
  if (error) return res.status(400).json({ success: false, error: error.message });

  return res.json({ success: true, data: { message: 'Review removido.' } });
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/reviews/:id/reply — Resposta do dono ao review (admin)
// Body: { reply }
// ─────────────────────────────────────────────────────────────────────────────
export async function replyToReview(req: Request, res: Response): Promise<Response> {
  const reviewId = parseInt(req.params.id, 10);
  const { reply } = req.body;

  if (!reply?.trim()) {
    return res.status(400).json({ success: false, error: 'reply não pode ser vazio.' });
  }

  const { error } = await supabase
    .from('reviews')
    .update({
      owner_reply:    reply.trim(),
      owner_reply_at: new Date().toISOString(),
    })
    .eq('id', reviewId);

  if (error) return res.status(400).json({ success: false, error: error.message });

  return res.json({ success: true, data: { message: 'Resposta salva.' } });
}
