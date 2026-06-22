import { Request, Response } from 'express';
import { supabase } from '../../config/supabase';
import type { Database } from '../../types/database';

type ProductUpdate = Database['public']['Tables']['products']['Update'];

// ─────────────────────────────────────────
// ROTAS PÚBLICAS
// ─────────────────────────────────────────

// GET /api/products
// Query params: ?page=1&limit=20&category=uuid&search=camiseta&featured=true&sort=price_asc
export async function listProducts(req: Request, res: Response): Promise<Response> {
  const page      = Math.max(1, parseInt(req.query.page  as string) || 1);
  const limit     = Math.min(100, parseInt(req.query.limit as string) || 20);
  const offset    = (page - 1) * limit;
  const category  = req.query.category  as string | undefined;
  const search    = req.query.search    as string | undefined;
  const featured  = req.query.featured  as string | undefined;
  const sort      = req.query.sort      as string | undefined;
  const minPrice  = req.query.min_price as string | undefined;
  const maxPrice  = req.query.max_price as string | undefined;

  // Todos os filtros primeiro, .range() e .order() apenas no final
  let query = supabase
    .from('products')
    .select(`
      id,
      name,
      slug,
      short_description,
      brand,
      base_price,
      compare_price,
      is_featured,
      published_at,
      category_id,
      categories ( id, name, slug ),
      product_images ( url, alt_text, is_primary, sort_order ),
      product_variants ( inventory ( quantity, reserved_quantity ) )
    `, { count: 'exact' })
    .eq('is_active', true)
    .not('published_at', 'is', null);

  // Filtro por categoria
  if (category) query = query.eq('category_id', parseInt(category, 10));

  // Filtro por destaque
  if (featured === 'true') query = query.eq('is_featured', true);

  // Filtro por faixa de preço (deve vir antes do .range())
  if (minPrice) query = query.gte('base_price', parseFloat(minPrice));
  if (maxPrice) query = query.lte('base_price', parseFloat(maxPrice));

  // Busca por nome, marca ou tags
  if (search) {
    query = query.or(`name.ilike.%${search}%,brand.ilike.%${search}%,short_description.ilike.%${search}%`);
  }

  // Ordenação (antes da paginação)
  switch (sort) {
    case 'price_asc':  query = query.order('base_price', { ascending: true });  break;
    case 'price_desc': query = query.order('base_price', { ascending: false }); break;
    case 'newest':     query = query.order('published_at', { ascending: false }); break;
    default:           query = query.order('created_at', { ascending: false });
  }

  // Paginação por último
  query = query.range(offset, offset + limit - 1);

  const { data: products, error, count } = await query;

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  // Garante que cada produto retorna só a imagem principal + calcula estoque
  const lista = (products ?? []).map(p => {
    const disponivel = ((p.product_variants as any[]) ?? []).reduce((acc, v) => {
      const inv = v.inventory;
      return acc + Math.max(0, (inv?.quantity ?? 0) - (inv?.reserved_quantity ?? 0));
    }, 0);
    return {
      ...p,
      product_variants: undefined,
      out_of_stock: disponivel === 0,
      low_stock:    disponivel > 0 && disponivel <= 5,
      product_images: (p.product_images as any[])
        .sort((a, b) => a.sort_order - b.sort_order)
        .filter(img => img.is_primary)
        .slice(0, 1),
    };
  });

  return res.json({
    success: true,
    data: { products: lista },
    pagination: {
      page,
      limit,
      total: count ?? 0,
      pages: Math.ceil((count ?? 0) / limit),
    },
  });
}

// GET /api/products/:slug
// Retorna produto completo com variantes, atributos, imagens e estoque
export async function getProductBySlug(req: Request, res: Response): Promise<Response> {
  const { slug } = req.params;

  const { data: product, error } = await supabase
    .from('products')
    .select(`
      *,
      categories ( id, name, slug ),
      product_images ( * ),
      collection_products ( collections ( id, name, slug, is_active ) ),
      product_variants (
        *,
        inventory ( quantity, reserved_quantity, low_stock_threshold ),
        product_variant_attributes (
          attribute_values (
            id,
            value,
            attributes ( id, name )
          )
        )
      )
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error || !product) {
    return res.status(404).json({ success: false, error: 'Produto não encontrado.' });
  }

  // Coleções visíveis a que o produto pertence
  const colecoes = (product.collection_products as any[] ?? [])
    .map(cp => cp.collections)
    .filter((c: any) => c && c.is_active)
    .map((c: any) => ({ id: c.id, name: c.name, slug: c.slug }));

  // Ordena imagens e filtra variantes ativas
  const resultado = {
    ...product,
    collection_products: undefined,
    collections: colecoes,
    product_images: (product.product_images as any[]).sort((a, b) => a.sort_order - b.sort_order),
    product_variants: (product.product_variants as any[])
      .filter(v => v.is_active)
      .map(v => ({
        ...v,
        // Estoque disponível = total - reservado
        stock_available: Math.max(0, (v.inventory?.quantity ?? 0) - (v.inventory?.reserved_quantity ?? 0)),
        // Organiza atributos em { Tamanho: 'M', Cor: 'Preto' }
        attributes: (v.product_variant_attributes as any[]).reduce((acc: Record<string, string>, pva: any) => {
          const attrName  = pva.attribute_values?.attributes?.name;
          const attrValue = pva.attribute_values?.value;
          if (attrName && attrValue) acc[attrName] = attrValue;
          return acc;
        }, {}),
      })),
  };

  return res.json({ success: true, data: { product: resultado } });
}

// ─────────────────────────────────────────
// ROTAS ADMIN (authMiddleware + adminMiddleware aplicados na rota)
// ─────────────────────────────────────────

// POST /api/products
export async function createProduct(req: Request, res: Response): Promise<Response> {
  const {
    category_id, name, slug, short_description, description,
    brand, material, care_instructions, tags,
    base_price, compare_price, is_featured,
  } = req.body;

  if (!name || !slug || !base_price) {
    return res.status(400).json({ success: false, error: 'Nome, slug e preço base são obrigatórios.' });
  }

  const { data: product, error } = await supabase
    .from('products')
    .insert({
      category_id:       category_id       ?? null,
      name,
      slug,
      short_description: short_description ?? null,
      description:       description       ?? null,
      brand:             brand             ?? null,
      material:          material          ?? null,
      care_instructions: care_instructions ?? null,
      tags:              tags              ?? null,
      base_price,
      compare_price:     compare_price     ?? null,
      is_featured:       is_featured       ?? false,
      is_active:         true,
      published_at:      new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  return res.status(201).json({ success: true, data: { product } });
}

// PUT /api/products/:id
export async function updateProduct(req: Request, res: Response): Promise<Response> {
  const { id } = req.params;

  const {
    category_id, name, slug, short_description, description,
    brand, material, care_instructions, tags,
    base_price, compare_price, is_featured, is_active, published_at,
  } = req.body;

  const productId = parseInt(id, 10);
  if (isNaN(productId)) {
    return res.status(400).json({ success: false, error: 'ID de produto inválido.' });
  }

  const campos: ProductUpdate = {};
  if (category_id       !== undefined) campos.category_id       = category_id === null || category_id === '' ? null : parseInt(category_id, 10);
  if (name              !== undefined) campos.name              = name;
  if (slug              !== undefined) campos.slug              = slug;
  if (short_description !== undefined) campos.short_description = short_description;
  if (description       !== undefined) campos.description       = description;
  if (brand             !== undefined) campos.brand             = brand;
  if (material          !== undefined) campos.material          = material;
  if (care_instructions !== undefined) campos.care_instructions = care_instructions;
  if (tags              !== undefined) campos.tags              = tags;
  if (base_price        !== undefined) campos.base_price        = base_price;
  if (compare_price     !== undefined) campos.compare_price     = compare_price;
  if (is_featured       !== undefined) campos.is_featured       = is_featured;
  if (is_active         !== undefined) campos.is_active         = is_active;
  if (published_at      !== undefined) campos.published_at      = published_at;

  if (Object.keys(campos).length === 0) {
    return res.status(400).json({ success: false, error: 'Nenhum campo enviado para atualização.' });
  }

  const { data: product, error } = await supabase
    .from('products')
    .update(campos)
    .eq('id', productId)
    .select()
    .single();

  if (error || !product) {
    return res.status(404).json({ success: false, error: 'Produto não encontrado.' });
  }

  return res.json({ success: true, data: { product } });
}

// DELETE /api/products/:id
export async function deleteProduct(req: Request, res: Response): Promise<Response> {
  const { id } = req.params;

  const productId = parseInt(id, 10);
  if (isNaN(productId)) {
    return res.status(400).json({ success: false, error: 'ID de produto inválido.' });
  }

  // Soft delete — apenas desativa o produto
  const { data: product, error } = await supabase
    .from('products')
    .update({ is_active: false })
    .eq('id', productId)
    .select('id, name, is_active')
    .single();

  if (error || !product) {
    return res.status(404).json({ success: false, error: 'Produto não encontrado.' });
  }

  return res.json({ success: true, data: { message: 'Produto desativado com sucesso.', product } });
}

// ═════════════════════════════════════════════════════════════════════════════
// ROTAS ADMIN — gerenciamento de produtos e variantes pelo painel
// ═════════════════════════════════════════════════════════════════════════════

// GET /api/products/admin/list — Lista TODOS os produtos (inclui inativos)
// Query: ?page=1&limit=20&search=camiseta
export async function listProductsAdmin(req: Request, res: Response): Promise<Response> {
  const page   = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit  = Math.min(100, parseInt(req.query.limit as string) || 30);
  const offset = (page - 1) * limit;
  const search = req.query.search as string | undefined;

  let query = supabase
    .from('products')
    .select(`
      id, name, slug, base_price, compare_price, is_active, is_featured,
      categories ( name ),
      product_images ( url, is_primary ),
      product_variants ( id )
    `, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (search) query = query.ilike('name', `%${search}%`);

  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error) return res.status(400).json({ success: false, error: error.message });

  const produtos = (data ?? []).map((p: any) => ({
    id:            p.id,
    name:          p.name,
    slug:          p.slug,
    base_price:    p.base_price,
    compare_price: p.compare_price,
    is_active:     p.is_active,
    is_featured:   p.is_featured,
    category_name: p.categories?.name ?? null,
    image:         (p.product_images ?? []).find((i: any) => i.is_primary)?.url
                   ?? (p.product_images ?? [])[0]?.url ?? null,
    variant_count: (p.product_variants ?? []).length,
  }));

  return res.json({
    success: true,
    data: { products: produtos },
    pagination: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) },
  });
}

// GET /api/products/admin/:id — Produto completo com variantes, preços e estoque (admin)
export async function getProductAdmin(req: Request, res: Response): Promise<Response> {
  const productId = parseInt(req.params.id, 10);
  if (isNaN(productId)) return res.status(400).json({ success: false, error: 'ID inválido.' });

  const { data: product, error } = await supabase
    .from('products')
    .select(`
      *,
      categories ( id, name ),
      product_images ( id, url, is_primary, sort_order ),
      collection_products ( collection_id ),
      product_variants (
        id, sku, price, is_active,
        inventory ( quantity, reserved_quantity, low_stock_threshold ),
        product_variant_attributes ( attribute_values ( value, attributes ( name ) ) )
      )
    `)
    .eq('id', productId)
    .single();

  if (error || !product) return res.status(404).json({ success: false, error: 'Produto não encontrado.' });

  // IDs das coleções a que o produto pertence
  const collectionIds = (product.collection_products as any[]).map(cp => cp.collection_id);

  const variants = (product.product_variants as any[]).map(v => ({
    id:          v.id,
    sku:         v.sku,
    price:       v.price,
    is_active:   v.is_active,
    quantity:    v.inventory?.quantity ?? 0,
    reserved:    v.inventory?.reserved_quantity ?? 0,
    available:   Math.max(0, (v.inventory?.quantity ?? 0) - (v.inventory?.reserved_quantity ?? 0)),
    low_stock_threshold: v.inventory?.low_stock_threshold ?? 3,
    attributes:  (v.product_variant_attributes as any[]).reduce((acc: any, pva: any) => {
      const nome = pva.attribute_values?.attributes?.name;
      const val  = pva.attribute_values?.value;
      if (nome && val) acc[nome] = val;
      return acc;
    }, {}),
  }));

  return res.json({
    success: true,
    data: {
      product: {
        ...product,
        product_variants: undefined,
        collection_products: undefined,
        collection_ids: collectionIds,
        variants,
      },
    },
  });
}

// PUT /api/products/admin/:id/collections — Define as coleções de um produto
// Body: { collection_ids: number[] }
export async function setProductCollections(req: Request, res: Response): Promise<Response> {
  const productId = parseInt(req.params.id, 10);
  const { collection_ids } = req.body;

  if (isNaN(productId)) return res.status(400).json({ success: false, error: 'ID inválido.' });
  if (!Array.isArray(collection_ids)) {
    return res.status(400).json({ success: false, error: 'collection_ids deve ser uma lista.' });
  }

  // Remove todos os vínculos atuais e recria com a nova seleção
  await supabase.from('collection_products').delete().eq('product_id', productId);

  if (collection_ids.length > 0) {
    const vinculos = collection_ids.map((cid: number, i: number) => ({
      collection_id: parseInt(String(cid), 10),
      product_id:    productId,
      sort_order:    i,
    }));
    const { error } = await supabase.from('collection_products').insert(vinculos);
    if (error) return res.status(400).json({ success: false, error: error.message });
  }

  return res.json({ success: true, data: { message: 'Coleções atualizadas.' } });
}

// POST /api/products/admin/:id/variants — Adiciona um tamanho (variante) a um produto existente
// Body: { size, price? }
export async function addVariant(req: Request, res: Response): Promise<Response> {
  const productId = parseInt(req.params.id, 10);
  const { size, price } = req.body;

  if (isNaN(productId)) return res.status(400).json({ success: false, error: 'ID inválido.' });
  if (!size?.trim())    return res.status(400).json({ success: false, error: 'Informe o tamanho.' });

  const tamanho = String(size).trim();

  // Produto existe? Pega o preço base como padrão
  const { data: prod } = await supabase.from('products').select('base_price').eq('id', productId).maybeSingle();
  if (!prod) return res.status(404).json({ success: false, error: 'Produto não encontrado.' });

  // Garante o atributo "Tamanho" e o valor
  let attr = (await supabase.from('attributes').select('id').eq('name', 'Tamanho').maybeSingle()).data;
  if (!attr) attr = (await supabase.from('attributes').insert({ name: 'Tamanho' }).select('id').single()).data!;

  let av = (await supabase.from('attribute_values')
    .select('id').eq('attribute_id', attr.id).eq('value', tamanho).maybeSingle()).data;
  if (!av) av = (await supabase.from('attribute_values')
    .insert({ attribute_id: attr.id, value: tamanho }).select('id').single()).data!;

  // Evita duplicar um tamanho já existente no produto
  const { data: existentes } = await supabase
    .from('product_variants')
    .select('id, product_variant_attributes ( attribute_value_id )')
    .eq('product_id', productId);
  const jaTem = (existentes ?? []).some((v: any) =>
    (v.product_variant_attributes ?? []).some((a: any) => a.attribute_value_id === av!.id));
  if (jaTem) return res.status(400).json({ success: false, error: `O tamanho "${tamanho}" já existe neste produto.` });

  const sku = `${productId}-${tamanho}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
  const { data: variant, error } = await supabase
    .from('product_variants')
    .insert({ product_id: productId, sku, price: price ? Number(price) : prod.base_price, is_active: true })
    .select('id')
    .single();

  if (error || !variant) return res.status(400).json({ success: false, error: error?.message ?? 'Erro ao criar tamanho.' });

  await supabase.from('product_variant_attributes').insert({ variant_id: variant.id, attribute_value_id: av.id });
  await supabase.from('inventory').insert({ variant_id: variant.id, quantity: 0, reserved_quantity: 0, low_stock_threshold: 3 });

  return res.status(201).json({ success: true, data: { variant_id: variant.id } });
}

// DELETE /api/products/admin/variants/:variantId — Remove um tamanho
// Se já houver pedidos com essa variante, apenas desativa (preserva histórico)
export async function deleteVariant(req: Request, res: Response): Promise<Response> {
  const variantId = parseInt(req.params.variantId, 10);
  if (isNaN(variantId)) return res.status(400).json({ success: false, error: 'ID inválido.' });

  // Há pedidos usando essa variante?
  const { data: usado } = await supabase
    .from('order_items')
    .select('id')
    .eq('variant_id', variantId)
    .limit(1)
    .maybeSingle();

  if (usado) {
    // Não pode apagar (quebraria histórico de pedidos) — desativa
    await supabase.from('product_variants').update({ is_active: false }).eq('id', variantId);
    return res.json({ success: true, data: { message: 'Tamanho tinha pedidos; foi desativado em vez de removido.' } });
  }

  // Sem pedidos — remove de vez (inventário, atributos, carrinho, variante)
  await supabase.from('inventory').delete().eq('variant_id', variantId);
  await supabase.from('product_variant_attributes').delete().eq('variant_id', variantId);
  await supabase.from('cart_items').delete().eq('variant_id', variantId);
  await supabase.from('inventory_movements').delete().eq('variant_id', variantId);
  const { error } = await supabase.from('product_variants').delete().eq('id', variantId);
  if (error) return res.status(400).json({ success: false, error: error.message });

  return res.json({ success: true, data: { message: 'Tamanho removido.' } });
}

// PATCH /api/products/admin/variants/:variantId — Atualiza APENAS preço e ativo da variante
// Estoque NÃO é alterado aqui — isso é exclusivo da aba Estoque (POST /inventory/movements),
// para que toda mudança de quantidade gere um movimento registrado.
// Body: { price?, is_active? }
export async function updateVariant(req: Request, res: Response): Promise<Response> {
  const variantId = parseInt(req.params.variantId, 10);
  const { price, is_active } = req.body;

  if (isNaN(variantId)) return res.status(400).json({ success: false, error: 'ID de variante inválido.' });

  const campos: Record<string, any> = {};
  if (price     !== undefined) campos.price     = Number(price);
  if (is_active !== undefined) campos.is_active = is_active;

  if (Object.keys(campos).length > 0) {
    const { error } = await supabase.from('product_variants').update(campos as any).eq('id', variantId);
    if (error) return res.status(400).json({ success: false, error: error.message });
  }

  return res.json({ success: true, data: { message: 'Variante atualizada.' } });
}

// POST /api/products/admin/full — Cria um produto completo com variantes e estoque
// Body: { name, slug?, base_price, compare_price?, category_id?, brand?, short_description?,
//         description?, image_url?, is_featured?, variants: [{ size, price, stock }] }
export async function createProductFull(req: Request, res: Response): Promise<Response> {
  const {
    name, slug, base_price, compare_price, category_id, brand,
    short_description, description, image_url, is_featured, variants,
  } = req.body;

  if (!name || !base_price) {
    return res.status(400).json({ success: false, error: 'Nome e preço base são obrigatórios.' });
  }
  if (!variants?.length) {
    return res.status(400).json({ success: false, error: 'Informe ao menos um tamanho/variante.' });
  }

  // Gera slug automático se não informado
  const slugFinal = (slug?.trim() || name.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')) + '-' + Date.now().toString(36);

  // 1. Cria o produto
  const { data: product, error: prodErr } = await supabase
    .from('products')
    .insert({
      name,
      slug:              slugFinal,
      base_price:        Number(base_price),
      compare_price:     compare_price ? Number(compare_price) : null,
      category_id:       category_id ? parseInt(category_id, 10) : null,
      brand:             brand ?? null,
      short_description: short_description ?? null,
      description:       description ?? null,
      is_featured:       is_featured ?? false,
      is_active:         true,
      published_at:      new Date().toISOString(),
    })
    .select('id')
    .single();

  if (prodErr || !product) {
    return res.status(400).json({ success: false, error: prodErr?.message ?? 'Erro ao criar produto.' });
  }

  // 2. Imagem (se informada)
  if (image_url?.trim()) {
    await supabase.from('product_images').insert({
      product_id: product.id, url: image_url.trim(), alt_text: name, sort_order: 1, is_primary: true,
    });
  }

  // 3. Garante o atributo "Tamanho" e seus valores
  let attr = (await supabase.from('attributes').select('id').eq('name', 'Tamanho').maybeSingle()).data;
  if (!attr) {
    attr = (await supabase.from('attributes').insert({ name: 'Tamanho' }).select('id').single()).data!;
  }

  // 4. Cria cada variante + atributo + estoque
  for (const v of variants) {
    const tamanho = String(v.size).trim();
    if (!tamanho) continue;

    let av = (await supabase.from('attribute_values')
      .select('id').eq('attribute_id', attr.id).eq('value', tamanho).maybeSingle()).data;
    if (!av) {
      av = (await supabase.from('attribute_values')
        .insert({ attribute_id: attr.id, value: tamanho }).select('id').single()).data!;
    }

    const sku = `${product.id}-${tamanho}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    const { data: variant } = await supabase
      .from('product_variants')
      .insert({ product_id: product.id, sku, price: Number(v.price) || Number(base_price), is_active: true })
      .select('id')
      .single();

    if (variant) {
      await supabase.from('product_variant_attributes').insert({
        variant_id: variant.id, attribute_value_id: av.id,
      });
      // Produto nasce com estoque 0 — a quantidade é definida na aba Estoque (gera movimento)
      await supabase.from('inventory').insert({
        variant_id: variant.id, quantity: 0,
        reserved_quantity: 0, low_stock_threshold: 3,
      });
    }
  }

  return res.status(201).json({ success: true, data: { product_id: product.id } });
}
