import { Request, Response } from 'express';
import { supabase } from '../../config/supabase';
import { Database } from '../../types/database';

type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — Cria uma notificação no banco (usado por outros módulos)
// ─────────────────────────────────────────────────────────────────────────────
export async function criarNotificacao(
  userId: string,
  type: Database['public']['Enums']['notification_type'],
  title: string,
  message: string,
  data?: object,
) {
  const notif: NotificationInsert = {
    user_id: userId,
    type,
    title,
    message,
    data:    data ? (data as any) : null,
    is_read: false,
  };
  await supabase.from('notifications').insert(notif);
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/notifications — Lista notificações do usuário
// ─────────────────────────────────────────────────────────────────────────────
export async function listNotifications(req: Request, res: Response): Promise<Response> {
  const userId   = req.user!.id;
  const page     = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit    = Math.min(50, parseInt(req.query.limit as string) || 20);
  const offset   = (page - 1) * limit;
  const unreadOnly = req.query.unread === 'true';

  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (unreadOnly) query = query.eq('is_read', false);

  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error) return res.status(400).json({ success: false, error: error.message });

  // Conta não lidas separado para o badge da navbar
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  return res.json({
    success: true,
    data:    { notifications: data, unread_count: unreadCount ?? 0 },
    pagination: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/notifications/:id/read — Marcar uma notificação como lida
// ─────────────────────────────────────────────────────────────────────────────
export async function markAsRead(req: Request, res: Response): Promise<Response> {
  const userId = req.user!.id;
  const id     = parseInt(req.params.id, 10);

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId); // Garante que só marca as próprias

  if (error) return res.status(400).json({ success: false, error: error.message });
  return res.json({ success: true, data: { message: 'Notificação marcada como lida.' } });
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/notifications/read-all — Marcar todas como lidas
// ─────────────────────────────────────────────────────────────────────────────
export async function markAllAsRead(req: Request, res: Response): Promise<Response> {
  const userId = req.user!.id;
  const agora  = new Date().toISOString();

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: agora })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) return res.status(400).json({ success: false, error: error.message });
  return res.json({ success: true, data: { message: 'Todas as notificações marcadas como lidas.' } });
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/notifications/:id — Deletar uma notificação
// ─────────────────────────────────────────────────────────────────────────────
export async function deleteNotification(req: Request, res: Response): Promise<Response> {
  const userId = req.user!.id;
  const id     = parseInt(req.params.id, 10);

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) return res.status(400).json({ success: false, error: error.message });
  return res.json({ success: true, data: { message: 'Notificação removida.' } });
}
