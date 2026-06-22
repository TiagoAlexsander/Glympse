import { Request, Response } from 'express';
import { supabase } from '../../config/supabase';
import type { Database } from '../../types/database';

type CategoryUpdate = Database['public']['Tables']['categories']['Update'];

// GET /api/categories
// Query params: ?parent_id=5 (filha de uma categoria), ?root=true (só raiz)
export async function listCategories(req: Request, res: Response): Promise<Response> {
  const { parent_id, root } = req.query;

  let query = supabase
    .from('categories')
    .select('id, parent_id, name, slug, description, image_url, sort_order, is_active')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (root === 'true') {
    query = query.is('parent_id', null);
  } else if (parent_id) {
    query = query.eq('parent_id', parseInt(parent_id as string, 10));
  }

  const { data: categories, error } = await query;

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  return res.json({ success: true, data: { categories } });
}

// POST /api/categories
export async function createCategory(req: Request, res: Response): Promise<Response> {
  const { parent_id, name, slug, description, image_url, sort_order } = req.body;

  if (!name || !slug) {
    return res.status(400).json({ success: false, error: 'Nome e slug são obrigatórios.' });
  }

  const { data: category, error } = await supabase
    .from('categories')
    .insert({
      parent_id:   parent_id  ?? null,
      name,
      slug,
      description: description ?? null,
      image_url:   image_url   ?? null,
      sort_order:  sort_order  ?? 0,
      is_active:   true,
    })
    .select()
    .single();

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  return res.status(201).json({ success: true, data: { category } });
}

// PUT /api/categories/:id
export async function updateCategory(req: Request, res: Response): Promise<Response> {
  const { id } = req.params;
  const { parent_id, name, slug, description, image_url, sort_order, is_active } = req.body;

  const campos: CategoryUpdate = {};
  if (parent_id   !== undefined) campos.parent_id   = parent_id;
  if (name        !== undefined) campos.name        = name;
  if (slug        !== undefined) campos.slug        = slug;
  if (description !== undefined) campos.description = description;
  if (image_url   !== undefined) campos.image_url   = image_url;
  if (sort_order  !== undefined) campos.sort_order  = sort_order;
  if (is_active   !== undefined) campos.is_active   = is_active;

  const { data: category, error } = await supabase
    .from('categories')
    .update(campos)
    .eq('id', parseInt(id, 10))
    .select()
    .single();

  if (error || !category) {
    return res.status(404).json({ success: false, error: 'Categoria não encontrada.' });
  }

  return res.json({ success: true, data: { category } });
}

// DELETE /api/categories/:id — soft delete
export async function deleteCategory(req: Request, res: Response): Promise<Response> {
  const { id } = req.params;

  const { data: category, error } = await supabase
    .from('categories')
    .update({ is_active: false })
    .eq('id', parseInt(id, 10))
    .select('id, name, is_active')
    .single();

  if (error || !category) {
    return res.status(404).json({ success: false, error: 'Categoria não encontrada.' });
  }

  return res.json({ success: true, data: { message: 'Categoria desativada.', category } });
}
