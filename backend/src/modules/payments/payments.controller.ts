import { Request, Response } from 'express';
import { supabase } from '../../config/supabase';
import { criarNotificacao } from '../notifications/notifications.controller';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// Gera um ID de transação mock
function gerarTransactionId(metodo: string): string {
  const rand = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `MOCK-${metodo}-${rand}`;
}

// Busca o pedido e valida que pertence ao usuário e está pendente de pagamento
async function buscarPedido(orderId: number, userId: string) {
  const { data: order } = await supabase
    .from('orders')
    .select('id, total, payment_status, status, order_number')
    .eq('id', orderId)
    .eq('user_id', userId)
    .maybeSingle();
  return order;
}

// Cria ou atualiza o registro de pagamento e atualiza o pedido
async function processarPagamento(
  orderId: number,
  method: 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BOLETO',
  status: 'PENDING' | 'APPROVED' | 'FAILED',
  amount: number,
  gatewayTransactionId: string,
  gatewayResponse: object,
  installments = 1,
  installmentValue = 0,
) {
  // Insere o registro de pagamento
  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      order_id:               orderId,
      method,
      status:                 status === 'APPROVED' ? 'APPROVED' : status === 'FAILED' ? 'FAILED' : 'PROCESSING',
      amount,
      currency:               'BRL',
      gateway:                'mock',
      gateway_transaction_id: gatewayTransactionId,
      gateway_response:       gatewayResponse as any,
      installments,
      installment_value:      installmentValue || amount / installments,
      paid_at:                status === 'APPROVED' ? new Date().toISOString() : null,
    })
    .select('id')
    .single();

  if (error) return null;

  // Atualiza o status de pagamento do pedido
  if (status === 'APPROVED') {
    await supabase.from('orders').update({
      payment_status: 'PAID',
      status:         'CONFIRMED',
    }).eq('id', orderId);

    // Registra histórico
    await supabase.from('order_status_history').insert({
      order_id: orderId,
      status:   'CONFIRMED',
      notes:    `Pagamento aprovado via ${method}. Transação: ${gatewayTransactionId}`,
    });

    // Converte reserved_quantity em saída real do estoque
    const { data: items } = await supabase
      .from('order_items')
      .select('variant_id, quantity')
      .eq('order_id', orderId);

    for (const item of items ?? []) {
      const { data: inv } = await supabase
        .from('inventory')
        .select('quantity, reserved_quantity')
        .eq('variant_id', item.variant_id)
        .maybeSingle();

      if (inv) {
        await supabase.from('inventory').update({
          quantity:          Math.max(0, inv.quantity - item.quantity),
          reserved_quantity: Math.max(0, inv.reserved_quantity - item.quantity),
        }).eq('variant_id', item.variant_id);

        // Registra movimento de estoque
        await supabase.from('inventory_movements').insert({
          variant_id:     item.variant_id,
          type:           'OUT',
          quantity:       item.quantity,
          reason:         'Venda confirmada',
          reference_type: 'order',
          reference_id:   orderId,
        });
      }
    }
    // Notifica o usuário sobre o pagamento aprovado
    const { data: orderData } = await supabase
      .from('orders')
      .select('user_id, order_number, total')
      .eq('id', orderId)
      .maybeSingle();

    if (orderData) {
      await criarNotificacao(
        orderData.user_id,
        'PAYMENT_APPROVED',
        'Pagamento aprovado! 🎉',
        `Seu pedido ${orderData.order_number} foi confirmado. Total: R$ ${orderData.total.toFixed(2)}`,
        { order_id: orderId, order_number: orderData.order_number },
      );
    }
  } else if (status === 'FAILED') {
    await supabase.from('orders').update({ payment_status: 'FAILED' }).eq('id', orderId);

    // Obs: não criamos notificação aqui. A falha de cartão é síncrona — o erro
    // já é mostrado na tela de pagamento. Notificar geraria spam a cada tentativa.

    // Libera a reserva de estoque ao falhar
    const { data: items } = await supabase
      .from('order_items')
      .select('variant_id, quantity')
      .eq('order_id', orderId);

    for (const item of items ?? []) {
      const { data: inv } = await supabase
        .from('inventory')
        .select('reserved_quantity')
        .eq('variant_id', item.variant_id)
        .maybeSingle();

      if (inv) {
        await supabase.from('inventory').update({
          reserved_quantity: Math.max(0, inv.reserved_quantity - item.quantity),
        }).eq('variant_id', item.variant_id);
      }
    }
  }

  return payment;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/:orderId/pix
// Gera uma cobrança PIX (mock)
// ─────────────────────────────────────────────────────────────────────────────
export async function createPixPayment(req: Request, res: Response): Promise<Response> {
  const userId  = req.user!.id;
  const orderId = parseInt(req.params.orderId, 10);

  const order = await buscarPedido(orderId, userId);
  if (!order) return res.status(404).json({ success: false, error: 'Pedido não encontrado.' });

  if (order.payment_status === 'PAID') {
    return res.status(400).json({ success: false, error: 'Este pedido já foi pago.' });
  }

  const transactionId = gerarTransactionId('PIX');

  // Mock: gera um código PIX copia-e-cola fake
  const pixCopiaECola =
    `00020126580014BR.GOV.BCB.PIX0136${userId.substring(0, 8)}-0000-0000-0000-000000000000` +
    `5204000053039865802BR5925GLYMPSE MODA LTDA6009SAO PAULO` +
    `62070503***6304${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`;

  // URL de QR Code gerado via API pública (sem deps externas)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixCopiaECola)}`;

  // Registra o pagamento como PENDING
  await processarPagamento(
    orderId, 'PIX', 'PENDING', order.total,
    transactionId, { pix_key: 'pagamentos@glympse.com.br', mock: true }
  );

  return res.json({
    success: true,
    data: {
      transaction_id:  transactionId,
      amount:          order.total,
      order_number:    order.order_number,
      pix_copia_cola:  pixCopiaECola,
      qr_code_url:     qrCodeUrl,
      expires_in:      1800, // 30 minutos
      instructions:    'Abra o app do seu banco, escolha Pix e escaneie o QR Code ou cole o código.',
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/:orderId/card
// Processa pagamento com cartão (mock)
// Body: { card_number, card_holder, expiry_month, expiry_year, cvv, installments }
// ─────────────────────────────────────────────────────────────────────────────
export async function createCardPayment(req: Request, res: Response): Promise<Response> {
  const userId  = req.user!.id;
  const orderId = parseInt(req.params.orderId, 10);
  const { card_number, card_holder, expiry_month, expiry_year, cvv, installments = 1 } = req.body;

  if (!card_number || !card_holder || !expiry_month || !expiry_year || !cvv) {
    return res.status(400).json({ success: false, error: 'Dados do cartão incompletos.' });
  }

  const order = await buscarPedido(orderId, userId);
  if (!order) return res.status(404).json({ success: false, error: 'Pedido não encontrado.' });

  if (order.payment_status === 'PAID') {
    return res.status(400).json({ success: false, error: 'Este pedido já foi pago.' });
  }

  // Mock: cartões que terminam em números específicos simulam recusa
  const ultimosDigitos = card_number.replace(/\s/g, '').slice(-4);
  const recusado = ['0000', '1111', '9999'].includes(ultimosDigitos);

  const transactionId = gerarTransactionId('CARD');
  const parcelas      = Math.max(1, Math.min(12, parseInt(installments, 10)));
  const valorParcela  = order.total / parcelas;

  const status = recusado ? 'FAILED' : 'APPROVED';

  await processarPagamento(
    orderId, 'CREDIT_CARD', status, order.total, transactionId,
    {
      last_four:  ultimosDigitos,
      holder:     card_holder,
      brand:      detectarBandeira(card_number),
      mock:       true,
      recusado,
    },
    parcelas,
    valorParcela,
  );

  if (recusado) {
    return res.status(422).json({
      success: false,
      error:   'Cartão recusado. Verifique os dados ou use outro cartão.',
      data:    { transaction_id: transactionId, status: 'FAILED' },
    });
  }

  return res.json({
    success: true,
    data: {
      transaction_id:    transactionId,
      status:            'APPROVED',
      amount:            order.total,
      installments:      parcelas,
      installment_value: valorParcela,
      last_four:         ultimosDigitos,
      brand:             detectarBandeira(card_number),
    },
  });
}

// Detecta a bandeira pelo primeiro dígito (mock simplificado)
function detectarBandeira(numero: string): string {
  const n = numero.replace(/\s/g, '');
  if (n.startsWith('4'))  return 'Visa';
  if (n.startsWith('5'))  return 'Mastercard';
  if (n.startsWith('3'))  return 'Amex';
  if (n.startsWith('6'))  return 'Elo';
  return 'Desconhecida';
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/:orderId/simulate
// Simula aprovação de pagamento (APENAS em desenvolvimento)
// Equivale ao webhook do Mercado Pago confirmando o PIX
// ─────────────────────────────────────────────────────────────────────────────
export async function simulatePayment(req: Request, res: Response): Promise<Response> {
  // Bloqueia em produção
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, error: 'Não disponível em produção.' });
  }

  const userId  = req.user!.id;
  const orderId = parseInt(req.params.orderId, 10);

  const order = await buscarPedido(orderId, userId);
  if (!order) return res.status(404).json({ success: false, error: 'Pedido não encontrado.' });

  if (order.payment_status === 'PAID') {
    return res.status(400).json({ success: false, error: 'Este pedido já foi pago.' });
  }

  const transactionId = gerarTransactionId('SIM');

  await processarPagamento(
    orderId, 'PIX', 'APPROVED', order.total, transactionId,
    { simulated: true, simulated_at: new Date().toISOString() }
  );

  return res.json({
    success: true,
    data: { transaction_id: transactionId, status: 'APPROVED', message: 'Pagamento simulado com sucesso.' },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payments/:orderId/status
// Consulta o status atual do pagamento (usado pelo frontend em polling)
// ─────────────────────────────────────────────────────────────────────────────
export async function getPaymentStatus(req: Request, res: Response): Promise<Response> {
  const userId  = req.user!.id;
  const orderId = parseInt(req.params.orderId, 10);

  const { data: order } = await supabase
    .from('orders')
    .select('id, order_number, payment_status, status')
    .eq('id', orderId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!order) return res.status(404).json({ success: false, error: 'Pedido não encontrado.' });

  const { data: payment } = await supabase
    .from('payments')
    .select('id, method, status, amount, gateway_transaction_id, paid_at, installments, installment_value')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return res.json({
    success: true,
    data: {
      order_id:       order.id,
      order_number:   order.order_number,
      order_status:   order.status,
      payment_status: order.payment_status,
      payment,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/webhook
// (Reservado para o Mercado Pago real — não faz nada no mock)
// ─────────────────────────────────────────────────────────────────────────────
export async function webhook(_req: Request, res: Response): Promise<Response> {
  // Quando integrar o MP real, aqui vai:
  // 1. Verificar assinatura do webhook
  // 2. Buscar o pagamento pela notification_id
  // 3. Chamar processarPagamento() com o status real
  return res.status(200).json({ success: true });
}
