import { Request, Response } from 'express';
import { supabase } from '../../config/supabase';

// ─────────────────────────────────────────
// GET /api/admin/dashboard — Estatísticas gerais para o painel
// ─────────────────────────────────────────
export async function getDashboard(_req: Request, res: Response): Promise<Response> {
  // Contagens rápidas via head + count
  const [usersCount, productsCount, ordersAll, pendingReturns, pendingReviews] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('orders').select('status, payment_status, total'),
    supabase.from('returns').select('id', { count: 'exact', head: true }).eq('status', 'REQUESTED'),
    supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('is_approved', false),
  ]);

  const orders = ordersAll.data ?? [];
  const receita = orders
    .filter(o => o.payment_status === 'PAID')
    .reduce((acc, o) => acc + (o.total ?? 0), 0);

  // Agrupa pedidos por status
  const porStatus: Record<string, number> = {};
  for (const o of orders) porStatus[o.status] = (porStatus[o.status] ?? 0) + 1;

  // Itens com estoque baixo
  const { data: lowStock } = await supabase
    .from('inventory')
    .select('id, quantity, low_stock_threshold');
  const estoqueBaixo = (lowStock ?? []).filter(i => i.quantity <= (i.low_stock_threshold ?? 3)).length;

  return res.json({
    success: true,
    data: {
      total_users:     usersCount.count ?? 0,
      total_products:  productsCount.count ?? 0,
      total_orders:    orders.length,
      receita_total:   Math.round(receita * 100) / 100,
      pedidos_por_status: porStatus,
      pending_returns: pendingReturns.count ?? 0,
      pending_reviews: pendingReviews.count ?? 0,
      low_stock_items: estoqueBaixo,
    },
  });
}

// ─────────────────────────────────────────
// GERENCIAMENTO DE USUÁRIOS (só ADMIN)
// ─────────────────────────────────────────

// GET /api/admin/users
// Query params opcionais: ?page=1&limit=20&role=USER&search=joao
export async function listUsers(req: Request, res: Response): Promise<Response> {
  const page   = Math.max(1, parseInt(req.query.page  as string) || 1);
  const limit  = Math.min(100, parseInt(req.query.limit as string) || 20);
  const offset = (page - 1) * limit;
  const role   = req.query.role   as string | undefined;
  const search = req.query.search as string | undefined;

  let query = supabase
    .from('users')
    .select('id, first_name, last_name, display_name, username, role, is_active, phone, avatar_url, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Filtra por role se informado (ex: ?role=ADMIN)
  if (role === 'ADMIN' || role === 'USER') {
    query = query.eq('role', role);
  }

  // Busca por nome ou username se informado (ex: ?search=joao)
  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,username.ilike.%${search}%`);
  }

  const { data: users, error, count } = await query;

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  return res.json({
    success: true,
    data: { users },
    pagination: {
      page,
      limit,
      total: count ?? 0,
      pages: Math.ceil((count ?? 0) / limit),
    },
  });
}

// GET /api/admin/users/:id
export async function getUserById(req: Request, res: Response): Promise<Response> {
  const { id } = req.params;

  // Busca perfil na tabela publica
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, first_name, last_name, display_name, username, role, is_active, phone, avatar_url, birth_date, newsletter_opt_in, last_login_at, email_verified_at, created_at, updated_at')
    .eq('id', id)
    .single();

  if (profileError || !profile) {
    return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
  }

  // Busca email no Auth do Supabase (email fica em auth.users, nao em public.users)
  const { data: authUser } = await supabase.auth.admin.getUserById(id);

  // Busca enderecos do usuario
  const { data: addresses } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', id)
    .order('is_default', { ascending: false });

  return res.json({
    success: true,
    data: {
      user: {
        email: authUser?.user?.email ?? null,
        ...profile,
        addresses: addresses ?? [],
      },
    },
  });
}

// PATCH /api/admin/users/:id/role
// Body: { "role": "ADMIN" } ou { "role": "USER" }
export async function updateUserRole(req: Request, res: Response): Promise<Response> {
  const { id }   = req.params;
  const { role } = req.body;

  if (role !== 'ADMIN' && role !== 'USER') {
    return res.status(400).json({ success: false, error: 'Role inválida. Use ADMIN ou USER.' });
  }

  // Impede que o admin se rebaixe acidentalmente
  if (id === req.user!.id && role === 'USER') {
    return res.status(400).json({ success: false, error: 'Você não pode remover seu próprio acesso de admin.' });
  }

  const { data: profile, error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', id)
    .select('id, first_name, last_name, role, updated_at')
    .single();

  if (error || !profile) {
    return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
  }

  return res.json({ success: true, data: { user: profile } });
}

// PATCH /api/admin/users/:id/status
// Body: { "is_active": false }
export async function updateUserStatus(req: Request, res: Response): Promise<Response> {
  const { id }        = req.params;
  const { is_active } = req.body;

  if (typeof is_active !== 'boolean') {
    return res.status(400).json({ success: false, error: 'is_active deve ser true ou false.' });
  }

  // Impede que o admin se desative
  if (id === req.user!.id && !is_active) {
    return res.status(400).json({ success: false, error: 'Você não pode desativar sua própria conta.' });
  }

  const { data: profile, error } = await supabase
    .from('users')
    .update({ is_active })
    .eq('id', id)
    .select('id, first_name, last_name, is_active, updated_at')
    .single();

  if (error || !profile) {
    return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
  }

  return res.json({ success: true, data: { user: profile } });
}

// DELETE /api/admin/users/:id
// Remove o usuario do Auth (cascateia para public.users via trigger)
export async function deleteUser(req: Request, res: Response): Promise<Response> {
  const { id } = req.params;

  // Impede que o admin se delete
  if (id === req.user!.id) {
    return res.status(400).json({ success: false, error: 'Você não pode deletar sua própria conta.' });
  }

  const { error } = await supabase.auth.admin.deleteUser(id);

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  return res.json({ success: true, data: { message: 'Usuário removido com sucesso.' } });
}
