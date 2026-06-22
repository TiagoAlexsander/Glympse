import { Request, Response } from 'express';
import { supabase } from '../../config/supabase';
import { Database } from '../../types/database';

type MovementInsert = Database['public']['Tables']['inventory_movements']['Insert'];

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/inventory — Lista inventário com filtros
// Query: search, low_stock, page, limit
// ─────────────────────────────────────────────────────────────────────────────
export async function getInventory(req: Request, res: Response): Promise<Response> {
  const page      = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit     = Math.min(100, parseInt(req.query.limit as string) || 20);
  const offset    = (page - 1) * limit;
  const search    = (req.query.search as string)?.trim() ?? '';
  const lowStock  = req.query.low_stock === 'true';

  // Busca variantes com estoque e produto
  let query = supabase
    .from('inventory')
    .select(`
      id, quantity, reserved_quantity, low_stock_threshold, updated_at,
      product_variants (
        id, sku, price, color_name,
        products ( id, name, slug ),
        product_variant_attributes (
          attribute_values ( value, attributes ( name ) )
        )
      )
    `, { count: 'exact' });

  if (lowStock) {
    // Filtra itens com estoque abaixo do limite
    query = query.lte('quantity', supabase.rpc as any);
  }

  const { data, error, count } = await query
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return res.status(400).json({ success: false, error: error.message });

  // Formata e filtra por busca (nome do produto ou SKU)
  let itens = (data ?? []).map(inv => {
    const variant = inv.product_variants as any;
    const product = variant?.products as any;
    const atributos = (variant?.product_variant_attributes ?? []).reduce(
      (acc: Record<string, string>, pva: any) => {
        const nome  = pva.attribute_values?.attributes?.name;
        const valor = pva.attribute_values?.value;
        if (nome && valor) acc[nome] = valor;
        return acc;
      }, {}
    );

    return {
      id:                inv.id,
      variant_id:        variant?.id,
      sku:               variant?.sku,
      product_name:      product?.name,
      product_slug:      product?.slug,
      attributes:        atributos,
      color_name:        variant?.color_name,
      price:             variant?.price,
      quantity:          inv.quantity,
      reserved_quantity: inv.reserved_quantity,
      available:         Math.max(0, inv.quantity - inv.reserved_quantity),
      low_stock_threshold: inv.low_stock_threshold,
      is_low_stock:      inv.quantity <= (inv.low_stock_threshold ?? 5),
      updated_at:        inv.updated_at,
    };
  });

  // Filtro por busca (client-side após formatação)
  if (search) {
    const termo = search.toLowerCase();
    itens = itens.filter(i =>
      i.product_name?.toLowerCase().includes(termo) ||
      i.sku?.toLowerCase().includes(termo)
    );
  }

  // Filtro de low_stock
  if (lowStock) {
    itens = itens.filter(i => i.is_low_stock);
  }

  return res.json({
    success: true,
    data:    { inventory: itens },
    pagination: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/inventory/summary — Resumo por categoria (painel de estoque)
// Conta produtos distintos por categoria e o estoque total de cada produto
// ─────────────────────────────────────────────────────────────────────────────
export async function getStockSummary(_req: Request, res: Response): Promise<Response> {
  // Busca produtos ativos com categoria, imagem e o estoque somado das variantes
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      id, name, slug, is_active,
      categories ( id, name ),
      product_images ( url, is_primary ),
      product_variants ( id, inventory ( quantity, reserved_quantity, low_stock_threshold ) )
    `)
    .eq('is_active', true);

  if (error) return res.status(400).json({ success: false, error: error.message });

  // Monta os produtos com estoque agregado
  const produtos = (products ?? []).map((p: any) => {
    let estoque = 0;
    let reservado = 0;
    let threshold = 3;
    for (const v of p.product_variants ?? []) {
      estoque   += v.inventory?.quantity ?? 0;
      reservado += v.inventory?.reserved_quantity ?? 0;
      if (v.inventory?.low_stock_threshold != null) threshold = v.inventory.low_stock_threshold;
    }
    const disponivel = Math.max(0, estoque - reservado);
    return {
      id:            p.id,
      name:          p.name,
      slug:          p.slug,
      category_id:   p.categories?.id ?? 0,
      category_name: p.categories?.name ?? 'Sem categoria',
      image:         (p.product_images ?? []).find((i: any) => i.is_primary)?.url
                     ?? (p.product_images ?? [])[0]?.url ?? null,
      variant_count: (p.product_variants ?? []).length,
      estoque,
      reservado,
      disponivel,
      sem_estoque:   disponivel === 0,
      estoque_baixo: disponivel > 0 && disponivel <= threshold * Math.max(1, (p.product_variants ?? []).length),
    };
  });

  // Agrupa por categoria
  const mapa: Record<string, any> = {};
  for (const p of produtos) {
    const chave = String(p.category_id);
    if (!mapa[chave]) {
      mapa[chave] = {
        category_id:   p.category_id,
        category_name: p.category_name,
        produtos:      [],
        total_produtos: 0,
        total_estoque:  0,
        sem_estoque:    0,
        estoque_baixo:  0,
      };
    }
    mapa[chave].produtos.push(p);
    mapa[chave].total_produtos += 1;
    mapa[chave].total_estoque  += p.estoque;
    if (p.sem_estoque)   mapa[chave].sem_estoque   += 1;
    if (p.estoque_baixo) mapa[chave].estoque_baixo += 1;
  }

  const categorias = Object.values(mapa).sort((a: any, b: any) =>
    a.category_name.localeCompare(b.category_name));

  return res.json({
    success: true,
    data: {
      categorias,
      totais: {
        produtos:      produtos.length,
        estoque:       produtos.reduce((a, p) => a + p.estoque, 0),
        sem_estoque:   produtos.filter(p => p.sem_estoque).length,
        estoque_baixo: produtos.filter(p => p.estoque_baixo).length,
      },
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/inventory/movements — Histórico de movimentos
// Query: variant_id, type, page, limit
// ─────────────────────────────────────────────────────────────────────────────
export async function listInventoryMovements(req: Request, res: Response): Promise<Response> {
  const page       = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit      = Math.min(100, parseInt(req.query.limit as string) || 30);
  const offset     = (page - 1) * limit;
  const variantId  = req.query.variant_id ? parseInt(req.query.variant_id as string, 10) : null;

  let query = supabase
    .from('inventory_movements')
    .select(`
      id, type, quantity, reason, reference_type, reference_id, created_at,
      product_variants ( sku, products ( name ) )
    `, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (variantId) query = query.eq('variant_id', variantId);

  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error) return res.status(400).json({ success: false, error: error.message });

  const movimentos = (data ?? []).map(m => ({
    id:             m.id,
    type:           m.type,
    quantity:       m.quantity,
    reason:         m.reason,
    reference_type: m.reference_type,
    reference_id:   m.reference_id,
    created_at:     m.created_at,
    variant_sku:    (m.product_variants as any)?.sku,
    product_name:   (m.product_variants as any)?.products?.name,
  }));

  return res.json({
    success: true,
    data:    { movements: movimentos },
    pagination: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/inventory/movements — Ajuste manual de estoque (admin)
// Body: { variant_id, type, quantity, reason }
// ─────────────────────────────────────────────────────────────────────────────
export async function createInventoryMovement(req: Request, res: Response): Promise<Response> {
  const adminId = req.user!.id;
  const { variant_id, type, quantity, reason } = req.body;

  if (!variant_id || !type || !quantity) {
    return res.status(400).json({ success: false, error: 'variant_id, type e quantity são obrigatórios.' });
  }

  const qtd = parseInt(quantity, 10);
  if (isNaN(qtd) || qtd <= 0) {
    return res.status(400).json({ success: false, error: 'quantity deve ser um número positivo.' });
  }

  const tiposValidos = ['IN', 'OUT', 'ADJUSTMENT'];
  if (!tiposValidos.includes(type)) {
    return res.status(400).json({ success: false, error: `type deve ser: ${tiposValidos.join(', ')}` });
  }

  // Busca estoque atual
  const { data: inv } = await supabase
    .from('inventory')
    .select('quantity, reserved_quantity')
    .eq('variant_id', parseInt(variant_id, 10))
    .maybeSingle();

  if (!inv) return res.status(404).json({ success: false, error: 'Variante não encontrada no estoque.' });

  // Calcula nova quantidade
  let novaQuantidade = inv.quantity;
  if (type === 'IN')         novaQuantidade = inv.quantity + qtd;
  if (type === 'OUT')        novaQuantidade = Math.max(0, inv.quantity - qtd);
  if (type === 'ADJUSTMENT') novaQuantidade = qtd; // ajuste define o valor exato

  // Atualiza estoque
  const { error: updateError } = await supabase
    .from('inventory')
    .update({ quantity: novaQuantidade })
    .eq('variant_id', parseInt(variant_id, 10));

  if (updateError) return res.status(400).json({ success: false, error: updateError.message });

  // Registra movimento
  const movimento: MovementInsert = {
    variant_id:  parseInt(variant_id, 10),
    type:        type as any,
    quantity:    qtd,
    reason:      reason ?? 'Ajuste manual pelo admin',
    created_by:  adminId,
  };

  const { data: mov, error: movError } = await supabase
    .from('inventory_movements')
    .insert(movimento)
    .select('id')
    .single();

  if (movError) return res.status(400).json({ success: false, error: movError.message });

  return res.status(201).json({
    success: true,
    data: {
      movement_id:   mov.id,
      variant_id:    parseInt(variant_id, 10),
      type,
      quantity:      qtd,
      nova_quantidade: novaQuantidade,
    },
  });
}
