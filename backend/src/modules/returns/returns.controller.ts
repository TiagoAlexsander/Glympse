import { Request, Response } from 'express';
import { supabase } from '../../config/supabase';
import { Database } from '../../types/database';
import { criarNotificacao } from '../notifications/notifications.controller';

type ReturnInsert     = Database['public']['Tables']['returns']['Insert'];
type ReturnItemInsert = Database['public']['Tables']['return_items']['Insert'];

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/returns — Criar solicitação de devolução (usuário logado)
// Body: { order_id, reason, notes?, items: [{ order_item_id, variant_id, quantity, reason?, condition_notes? }] }
// ─────────────────────────────────────────────────────────────────────────────
export async function createReturn(req: Request, res: Response): Promise<Response> {
  const userId = req.user!.id;
  const { order_id, reason, notes, items } = req.body;

  if (!order_id || !reason || !items?.length) {
    return res.status(400).json({ success: false, error: 'order_id, reason e items são obrigatórios.' });
  }

  const razonsValidas = ['WRONG_SIZE', 'WRONG_PRODUCT', 'DEFECTIVE', 'NOT_AS_DESCRIBED', 'CHANGED_MIND', 'OTHER'];
  if (!razonsValidas.includes(reason)) {
    return res.status(400).json({ success: false, error: `reason inválido. Válidos: ${razonsValidas.join(', ')}` });
  }

  // Verifica que o pedido pertence ao usuário e está entregue
  const { data: order } = await supabase
    .from('orders')
    .select('id, status, order_number')
    .eq('id', parseInt(order_id, 10))
    .eq('user_id', userId)
    .maybeSingle();

  if (!order) return res.status(404).json({ success: false, error: 'Pedido não encontrado.' });

  if (!['DELIVERED', 'CONFIRMED', 'PROCESSING', 'SHIPPED'].includes(order.status)) {
    return res.status(400).json({
      success: false,
      error: 'Só é possível solicitar devolução de pedidos entregues ou em andamento.',
    });
  }

  // Verifica se já existe devolução pendente para esse pedido
  const { data: devolucaoExistente } = await supabase
    .from('returns')
    .select('id, status')
    .eq('order_id', parseInt(order_id, 10))
    .eq('user_id', userId)
    .in('status', ['REQUESTED', 'APPROVED'])
    .maybeSingle();

  if (devolucaoExistente) {
    return res.status(400).json({
      success: false,
      error: 'Já existe uma solicitação de devolução ativa para este pedido.',
    });
  }

  // Cria a devolução
  const returnData: ReturnInsert = {
    order_id:  parseInt(order_id, 10),
    user_id:   userId,
    status:    'REQUESTED',
    reason:    reason as any,
    notes:     notes ?? null,
  };

  const { data: returnRecord, error: returnError } = await supabase
    .from('returns')
    .insert(returnData)
    .select('id')
    .single();

  if (returnError || !returnRecord) {
    return res.status(400).json({ success: false, error: returnError?.message ?? 'Erro ao criar devolução.' });
  }

  // Cria os itens da devolução
  const returnItems: ReturnItemInsert[] = items.map((item: any) => ({
    return_id:       returnRecord.id,
    order_item_id:   parseInt(item.order_item_id, 10),
    variant_id:      parseInt(item.variant_id, 10),
    quantity:        parseInt(item.quantity, 10) || 1,
    // reason é NOT NULL no banco — se o item não tiver motivo próprio, herda o da devolução
    reason:          item.reason ?? reason,
    condition_notes: item.condition_notes ?? null,
  }));

  const { error: itemsError } = await supabase.from('return_items').insert(returnItems);

  if (itemsError) {
    await supabase.from('returns').delete().eq('id', returnRecord.id);
    return res.status(400).json({ success: false, error: itemsError.message });
  }

  // Registra no histórico do pedido para aparecer na timeline
  await supabase.from('order_status_history').insert({
    order_id:   parseInt(order_id, 10),
    status:     order.status as any, // status do pedido não muda, mas o evento fica registrado
    changed_by: userId,
    notes:      `Devolução/troca solicitada pelo cliente. Motivo: ${reason}.`,
  });

  return res.status(201).json({
    success: true,
    data: {
      return_id:    returnRecord.id,
      order_number: order.order_number,
      status:       'REQUESTED',
      message:      'Solicitação enviada! Nossa equipe analisará em até 2 dias úteis.',
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/returns — Lista devoluções do usuário
// ─────────────────────────────────────────────────────────────────────────────
export async function listReturns(req: Request, res: Response): Promise<Response> {
  const userId = req.user!.id;

  const { data, error } = await supabase
    .from('returns')
    .select(`
      id, status, reason, notes, refund_amount, created_at, updated_at,
      orders ( id, order_number ),
      return_items (
        id, quantity, reason, condition_notes,
        product_variants ( sku, products ( name ) )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return res.status(400).json({ success: false, error: error.message });
  return res.json({ success: true, data: { returns: data } });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/returns/:id — Detalhe de uma devolução
// ─────────────────────────────────────────────────────────────────────────────
export async function getReturn(req: Request, res: Response): Promise<Response> {
  const userId   = req.user!.id;
  const returnId = parseInt(req.params.id, 10);

  const { data, error } = await supabase
    .from('returns')
    .select(`
      *,
      orders ( id, order_number ),
      return_items (
        id, quantity, reason, condition_notes,
        product_variants ( sku, price, products ( name ) )
      )
    `)
    .eq('id', returnId)
    .eq('user_id', userId)
    .single();

  if (error || !data) return res.status(404).json({ success: false, error: 'Devolução não encontrada.' });
  return res.json({ success: true, data: { return: data } });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/returns/admin — Lista todas as devoluções (admin)
// ─────────────────────────────────────────────────────────────────────────────
export async function listAllReturns(req: Request, res: Response): Promise<Response> {
  const page   = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit  = Math.min(100, parseInt(req.query.limit as string) || 20);
  const offset = (page - 1) * limit;
  const status = req.query.status as string | undefined;

  let query = supabase
    .from('returns')
    .select(`
      id, status, reason, notes, refund_amount, created_at,
      orders ( order_number, total ),
      users!returns_user_id_fkey ( display_name, first_name ),
      return_items (
        id, quantity,
        order_items ( product_name, unit_price, total_price ),
        product_variants ( sku, products ( name ) )
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status as any);

  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error) return res.status(400).json({ success: false, error: error.message });

  // Calcula o valor total dos itens devolvidos (sugestão de reembolso)
  const returns = (data ?? []).map((r: any) => {
    const valorItens = (r.return_items ?? []).reduce((acc: number, it: any) => {
      const preco = it.order_items?.unit_price ?? 0;
      return acc + preco * (it.quantity ?? 1);
    }, 0);
    return { ...r, valor_itens: Math.round(valorItens * 100) / 100 };
  });

  return res.json({
    success: true,
    data: { returns },
    pagination: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/returns/:id/status — Atualizar status da devolução (admin)
// Body: { status, refund_amount? }
// ─────────────────────────────────────────────────────────────────────────────
export async function updateReturnStatus(req: Request, res: Response): Promise<Response> {
  const adminId  = req.user!.id;
  const returnId = parseInt(req.params.id, 10);
  const { status, refund_amount } = req.body;

  const statusValidos = ['APPROVED', 'REJECTED', 'RECEIVED', 'REFUNDED', 'EXCHANGED'];
  if (!statusValidos.includes(status)) {
    return res.status(400).json({ success: false, error: `Status inválido. Válidos: ${statusValidos.join(', ')}` });
  }

  const atualizacao: Record<string, any> = {
    status,
    approved_by: adminId,
  };

  if (status === 'APPROVED') {
    atualizacao.approved_at = new Date().toISOString();
  }

  if (status === 'REFUNDED') {
    atualizacao.refund_amount  = refund_amount ?? null;
    atualizacao.refunded_at    = new Date().toISOString();
  }

  const { data: returnRecord, error } = await supabase
    .from('returns')
    .update(atualizacao as any)
    .eq('id', returnId)
    .select('id, user_id, status, order_id, orders ( order_number )')
    .single();

  if (error) return res.status(400).json({ success: false, error: error.message });

  const orderNumber = (returnRecord.orders as any)?.order_number ?? '';

  // Se reembolsado, o pedido inteiro reflete isso
  if (status === 'REFUNDED' && returnRecord.order_id) {
    await supabase
      .from('orders')
      .update({ status: 'REFUNDED', payment_status: 'REFUNDED' } as any)
      .eq('id', returnRecord.order_id);

    await supabase.from('order_status_history').insert({
      order_id:   returnRecord.order_id,
      status:     'REFUNDED' as any,
      changed_by: adminId,
      notes:      `Reembolso processado${refund_amount ? ` no valor de R$ ${Number(refund_amount).toFixed(2)}` : ''}.`,
    });
  }

  // Notifica o cliente sobre a decisão
  const mensagens: Record<string, { titulo: string; msg: string }> = {
    APPROVED:  { titulo: 'Devolução aprovada ✓',  msg: `Sua devolução do pedido ${orderNumber} foi aprovada. Envie o produto de volta.` },
    REJECTED:  { titulo: 'Devolução recusada',     msg: `Sua solicitação de devolução do pedido ${orderNumber} foi recusada.` },
    RECEIVED:  { titulo: 'Produto recebido',       msg: `Recebemos o produto devolvido do pedido ${orderNumber}. Reembolso em processamento.` },
    REFUNDED:  { titulo: 'Reembolso realizado 💰', msg: `O reembolso do pedido ${orderNumber} foi processado.` },
    EXCHANGED: { titulo: 'Troca realizada',        msg: `A troca do pedido ${orderNumber} foi concluída. O novo produto será enviado.` },
  };
  const notif = mensagens[status];
  if (notif && returnRecord.user_id) {
    await criarNotificacao(returnRecord.user_id, 'SYSTEM', notif.titulo, notif.msg, { order_id: returnRecord.order_id });
  }

  return res.json({
    success: true,
    data: {
      return_id: returnRecord.id,
      status,
      message:   `Devolução ${status === 'APPROVED' ? 'aprovada' : status === 'REJECTED' ? 'rejeitada' : 'atualizada'}.`,
    },
  });
}
