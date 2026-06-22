import { Request, Response } from 'express';
import { supabase } from '../../config/supabase';
import { Database } from '../../types/database';
import { criarNotificacao } from '../notifications/notifications.controller';

type ShipmentInsert = Database['public']['Tables']['shipments']['Insert'];

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/shipments/:orderId — Rastreio de um pedido
// ─────────────────────────────────────────────────────────────────────────────
export async function getShipment(req: Request, res: Response): Promise<Response> {
  const userId  = req.user!.id;
  const orderId = parseInt(req.params.orderId, 10);

  // Verifica que o pedido pertence ao usuário
  const { data: order } = await supabase
    .from('orders')
    .select('id, order_number, status, delivery_status')
    .eq('id', orderId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!order) return res.status(404).json({ success: false, error: 'Pedido não encontrado.' });

  const { data: shipment } = await supabase
    .from('shipments')
    .select(`
      id, carrier, tracking_code, tracking_url, status,
      shipped_at, estimated_delivery, delivered_at, notes,
      shipping_methods ( name, type, description )
    `)
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return res.json({
    success: true,
    data: {
      order_number:    order.order_number,
      order_status:    order.status,
      delivery_status: order.delivery_status,
      shipment:        shipment ?? null,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/shipments — Criar envio (admin)
// Body: { order_id, shipping_method_id, carrier, tracking_code, tracking_url?, estimated_delivery? }
// ─────────────────────────────────────────────────────────────────────────────
export async function createShipment(req: Request, res: Response): Promise<Response> {
  const { order_id, shipping_method_id, carrier, tracking_code, tracking_url, estimated_delivery, notes } = req.body;

  if (!order_id || !carrier || !tracking_code) {
    return res.status(400).json({ success: false, error: 'order_id, carrier e tracking_code são obrigatórios.' });
  }

  // Verifica que o pedido existe e está confirmado
  const { data: order } = await supabase
    .from('orders')
    .select('id, status, user_id, order_number')
    .eq('id', parseInt(order_id, 10))
    .maybeSingle();

  if (!order) return res.status(404).json({ success: false, error: 'Pedido não encontrado.' });

  const shipmentData: ShipmentInsert = {
    order_id:           parseInt(order_id, 10),
    shipping_method_id: shipping_method_id ? parseInt(shipping_method_id, 10) : null,
    carrier:            carrier.trim(),
    tracking_code:      tracking_code.trim(),
    tracking_url:       tracking_url?.trim() ?? null,
    status:             'SHIPPED',
    shipped_at:         new Date().toISOString(),
    estimated_delivery: estimated_delivery ?? null,
    notes:              notes ?? null,
  };

  const { data: shipment, error } = await supabase
    .from('shipments')
    .insert(shipmentData)
    .select('*')
    .single();

  if (error) return res.status(400).json({ success: false, error: error.message });

  // Atualiza status do pedido para SHIPPED
  await supabase
    .from('orders')
    .update({ status: 'SHIPPED', delivery_status: 'SHIPPED' })
    .eq('id', parseInt(order_id, 10));

  await supabase.from('order_status_history').insert({
    order_id: parseInt(order_id, 10),
    status:   'SHIPPED',
    notes:    `Enviado via ${carrier}. Código: ${tracking_code}`,
  });

  // Notifica o cliente que o pedido foi enviado
  await criarNotificacao(
    order.user_id, 'ORDER_SHIPPED', 'Pedido enviado 📦',
    `Seu pedido ${order.order_number} foi enviado via ${carrier}. Código de rastreio: ${tracking_code}`,
    { order_id: order.id, tracking_code },
  );

  return res.status(201).json({ success: true, data: { shipment } });
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/shipments/:id — Atualizar status do envio (admin)
// Body: { status, delivered_at? }
// ─────────────────────────────────────────────────────────────────────────────
export async function updateShipment(req: Request, res: Response): Promise<Response> {
  const shipmentId = parseInt(req.params.id, 10);
  const { status, notes } = req.body;

  const statusValidos = ['PREPARING', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED'];
  if (!statusValidos.includes(status)) {
    return res.status(400).json({ success: false, error: `Status inválido. Válidos: ${statusValidos.join(', ')}` });
  }

  const atualizacao: Record<string, any> = { status };
  if (status === 'DELIVERED') atualizacao.delivered_at = new Date().toISOString();
  if (notes) atualizacao.notes = notes;

  const { data: shipment, error } = await supabase
    .from('shipments')
    .update(atualizacao as any)
    .eq('id', shipmentId)
    .select('order_id, status')
    .single();

  if (error) return res.status(400).json({ success: false, error: error.message });

  // Sincroniza status no pedido quando entregue
  if (status === 'DELIVERED') {
    await supabase
      .from('orders')
      .update({ status: 'DELIVERED', delivery_status: 'DELIVERED' })
      .eq('id', shipment.order_id);

    await supabase.from('order_status_history').insert({
      order_id: shipment.order_id,
      status:   'DELIVERED',
      notes:    'Pedido entregue ao destinatário.',
    });

    // Notifica o cliente da entrega
    const { data: ord } = await supabase
      .from('orders')
      .select('user_id, order_number')
      .eq('id', shipment.order_id)
      .maybeSingle();
    if (ord) {
      await criarNotificacao(
        ord.user_id, 'ORDER_DELIVERED', 'Pedido entregue ✓',
        `Seu pedido ${ord.order_number} foi entregue. Aproveite! Se precisar, você pode solicitar devolução pela página do pedido.`,
        { order_id: shipment.order_id },
      );
    }
  }

  return res.json({ success: true, data: { message: 'Envio atualizado.', status } });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/shipments — Lista todos os envios (admin)
// ─────────────────────────────────────────────────────────────────────────────
export async function listShipments(req: Request, res: Response): Promise<Response> {
  const page   = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit  = Math.min(100, parseInt(req.query.limit as string) || 20);
  const offset = (page - 1) * limit;
  const status = req.query.status as string | undefined;

  let query = supabase
    .from('shipments')
    .select(`
      id, carrier, tracking_code, tracking_url, status,
      shipped_at, estimated_delivery, delivered_at,
      orders ( id, order_number, users ( display_name, first_name ) )
    `, { count: 'exact' })
    .order('shipped_at', { ascending: false });

  if (status) query = query.eq('status', status as any);

  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error) return res.status(400).json({ success: false, error: error.message });

  return res.json({
    success: true,
    data: { shipments: data },
    pagination: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) },
  });
}
