import { Request, Response } from 'express';
import { supabase } from '../../config/supabase';
import type { Database } from '../../types/database';

type CollectionUpdate = Database['public']['Tables']['collections']['Update'];

// GET /api/collections/admin/all — todas as coleções (inclui inativas) com contagem de produtos
export async function listCollectionsAdmin(_req: Request, res: Response): Promise<Response> {
  const { data, error } = await supabase
    .from('collections')
    .select('id, name, slug, description, image_url, is_active, sort_order, collection_products ( id )')
    .order('sort_order', { ascending: true });

  if (error) return res.status(400).json({ success: false, error: error.message });

  const collections = (data ?? []).map((c: any) => ({
    id:            c.id,
    name:          c.name,
    slug:          c.slug,
    description:   c.description,
    image_url:     c.image_url,
    is_active:     c.is_active,
    sort_order:    c.sort_order,
    product_count: (c.collection_products ?? []).length,
  }));

  return res.json({ success: true, data: { collections } });
}

// GET /api/collections
export async function listCollections(_req: Request, res: Response): Promise<Response> {
  const agora = new Date().toISOString();

  const { data: collections, error } = await supabase
    .from('collections')
    .select('id, name, slug, description, image_url, sort_order, starts_at, ends_at')
    .eq('is_active', true)
    .or(`starts_at.is.null,starts_at.lte.${agora}`)
    .or(`ends_at.is.null,ends_at.gte.${agora}`)
    .order('sort_order', { ascending: true });

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  return res.json({ success: true, data: { collections } });
}

// GET /api/collections/:id/products
export async function listCollectionProducts(req: Request, res: Response): Promise<Response> {
  const { id } = req.params;

  // Verifica se a coleção existe (visibilidade só importa na listagem pública)
  const { data: collection, error: colError } = await supabase
    .from('collections')
    .select('id, name, slug')
    .eq('id', parseInt(id, 10))
    .single();

  if (colError || !collection) {
    return res.status(404).json({ success: false, error: 'Coleção não encontrada.' });
  }

  // Busca os produtos vinculados à coleção
  const { data: items, error } = await supabase
    .from('collection_products')
    .select(`
      sort_order,
      products (
        id, name, slug, short_description, brand,
        base_price, compare_price, is_featured,
        product_images ( url, alt_text, is_primary, sort_order )
      )
    `)
    .eq('collection_id', parseInt(id, 10))
    .order('sort_order', { ascending: true });

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  const products = (items ?? []).map(item => ({
    ...(item.products as any),
    product_images: ((item.products as any)?.product_images ?? [])
      .filter((img: any) => img.is_primary)
      .slice(0, 1),
  }));

  return res.json({ success: true, data: { collection, products } });
}

// POST /api/collections/:id/products — Adiciona um produto à coleção (admin)
// Body: { product_id }
export async function addProductToCollection(req: Request, res: Response): Promise<Response> {
  const collectionId = parseInt(req.params.id, 10);
  const { product_id } = req.body;
  if (isNaN(collectionId) || !product_id) {
    return res.status(400).json({ success: false, error: 'Coleção e product_id são obrigatórios.' });
  }

  // Já está na coleção?
  const { data: existe } = await supabase
    .from('collection_products')
    .select('id')
    .eq('collection_id', collectionId)
    .eq('product_id', parseInt(product_id, 10))
    .maybeSingle();

  if (existe) return res.json({ success: true, data: { message: 'Produto já está na coleção.' } });

  const { error } = await supabase.from('collection_products').insert({
    collection_id: collectionId,
    product_id:    parseInt(product_id, 10),
    sort_order:    0,
  });
  if (error) return res.status(400).json({ success: false, error: error.message });

  return res.status(201).json({ success: true, data: { message: 'Produto adicionado à coleção.' } });
}

// DELETE /api/collections/:id/products/:productId — Remove um produto da coleção (admin)
export async function removeProductFromCollection(req: Request, res: Response): Promise<Response> {
  const collectionId = parseInt(req.params.id, 10);
  const productId    = parseInt(req.params.productId, 10);

  const { error } = await supabase
    .from('collection_products')
    .delete()
    .eq('collection_id', collectionId)
    .eq('product_id', productId);

  if (error) return res.status(400).json({ success: false, error: error.message });
  return res.json({ success: true, data: { message: 'Produto removido da coleção.' } });
}

// POST /api/collections
export async function createCollection(req: Request, res: Response): Promise<Response> {
  const { name, slug, description, image_url, sort_order, starts_at, ends_at } = req.body;

  if (!name || !slug) {
    return res.status(400).json({ success: false, error: 'Nome e slug são obrigatórios.' });
  }

  const { data: collection, error } = await supabase
    .from('collections')
    .insert({
      name,
      slug,
      description: description ?? null,
      image_url:   image_url   ?? null,
      sort_order:  sort_order  ?? 0,
      starts_at:   starts_at   ?? null,
      ends_at:     ends_at     ?? null,
      is_active:   true,
    })
    .select()
    .single();

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  return res.status(201).json({ success: true, data: { collection } });
}

// PUT /api/collections/:id
export async function updateCollection(req: Request, res: Response): Promise<Response> {
  const { id } = req.params;
  const { name, slug, description, image_url, sort_order, starts_at, ends_at, is_active } = req.body;

  const campos: CollectionUpdate = {};
  if (name        !== undefined) campos.name        = name;
  if (slug        !== undefined) campos.slug        = slug;
  if (description !== undefined) campos.description = description;
  if (image_url   !== undefined) campos.image_url   = image_url;
  if (sort_order  !== undefined) campos.sort_order  = sort_order;
  if (starts_at   !== undefined) campos.starts_at   = starts_at;
  if (ends_at     !== undefined) campos.ends_at     = ends_at;
  if (is_active   !== undefined) campos.is_active   = is_active;

  const { data: collection, error } = await supabase
    .from('collections')
    .update(campos)
    .eq('id', parseInt(id, 10))
    .select()
    .single();

  if (error || !collection) {
    return res.status(404).json({ success: false, error: 'Coleção não encontrada.' });
  }

  return res.json({ success: true, data: { collection } });
}

// DELETE /api/collections/:id — soft delete
export async function deleteCollection(req: Request, res: Response): Promise<Response> {
  const { id } = req.params;

  const { data: collection, error } = await supabase
    .from('collections')
    .update({ is_active: false })
    .eq('id', parseInt(id, 10))
    .select('id, name, is_active')
    .single();

  if (error || !collection) {
    return res.status(404).json({ success: false, error: 'Coleção não encontrada.' });
  }

  return res.json({ success: true, data: { message: 'Coleção desativada.', collection } });
}
