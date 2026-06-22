import { useEffect, useState } from 'react';
import { Link, useLocation, useRoute } from 'wouter';
import { api } from '@/services/api';
import { formatarReal, formatarDataHora } from '@/utils';

// ── Tipos ─────────────────────────────────────────────────────────────────────

type OrderItem = {
  id: number;
  product_name: string;
  variant_id: number;
  variant_sku: string;
  variant_attributes: Record<string, string>;
  product_image_url: string | null;
  product_slug: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
};

type StatusHistory = {
  status: string;
  notes: string | null;
  created_at: string;
};

type Shipment = {
  id: number;
  carrier: string;
  tracking_code: string;
  tracking_url: string | null;
  status: string;
  shipped_at: string | null;
  estimated_delivery: string | null;
  delivered_at: string | null;
  notes: string | null;
  shipping_methods: { name: string; type: string } | null;
};

type OrderReturn = {
  id: number;
  status: string;
  reason: string;
  notes: string | null;
  refund_amount: number | null;
  created_at: string;
  updated_at: string;
};

type Order = {
  id: number;
  order_number: string;
  status: string;
  payment_status: string;
  delivery_status: string;
  subtotal: number;
  discount_amount: number;
  shipping_cost: number;
  total: number;
  created_at: string;
  returns: OrderReturn[];
  shipping_address_snapshot: {
    recipient_name?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zip_code?: string;
  };
  order_items: OrderItem[];
  order_status_history: StatusHistory[];
};

// ── Mapas de status ────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  PENDING:    'Aguardando pagamento',
  CONFIRMED:  'Confirmado',
  PROCESSING: 'Em separação',
  SHIPPED:    'Enviado',
  DELIVERED:  'Entregue',
  CANCELLED:  'Cancelado',
  REFUNDED:   'Reembolsado',
};

const PAYMENT_LABEL: Record<string, string> = {
  PENDING:    'Aguardando',
  AUTHORIZED: 'Autorizado',
  PAID:       'Pago',
  FAILED:     'Falhou',
  REFUNDED:   'Reembolsado',
  CANCELLED:  'Cancelado',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING:    'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  CONFIRMED:  'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  PROCESSING: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  SHIPPED:    'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400',
  DELIVERED:  'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  CANCELLED:  'bg-red-500/15 text-red-600 dark:text-red-400',
  REFUNDED:   'bg-secondary text-muted-foreground',
  AUTHORIZED: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  PAID:       'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  FAILED:     'bg-red-500/15 text-red-600 dark:text-red-400',
};

const RAZOES_DEVOLUCAO = [
  { value: 'WRONG_SIZE',        label: 'Tamanho errado' },
  { value: 'WRONG_PRODUCT',     label: 'Produto errado' },
  { value: 'DEFECTIVE',         label: 'Produto com defeito' },
  { value: 'NOT_AS_DESCRIBED',  label: 'Diferente do descrito' },
  { value: 'CHANGED_MIND',      label: 'Mudei de ideia' },
  { value: 'OTHER',             label: 'Outro motivo' },
];

const RETURN_STATUS_LABEL: Record<string, string> = {
  REQUESTED: 'Em análise',
  APPROVED:  'Aprovada — envie o produto',
  REJECTED:  'Recusada',
  RECEIVED:  'Produto recebido',
  REFUNDED:  'Reembolsada',
  EXCHANGED: 'Trocada',
};

const RETURN_STATUS_COLOR: Record<string, string> = {
  REQUESTED: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  APPROVED:  'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  REJECTED:  'bg-red-500/15 text-red-600 dark:text-red-400',
  RECEIVED:  'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400',
  REFUNDED:  'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  EXCHANGED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
};

// ── Componente ────────────────────────────────────────────────────────────────

export function OrderDetailPage() {
  const [match, params] = useRoute<{ id: string }>('/orders/:id');
  const [, navigate]    = useLocation();
  const [order,    setOrder]    = useState<Order | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [erro,     setErro]     = useState<string | null>(null);

  // Devolução
  const [showReturn,  setShowReturn]  = useState(false);
  const [returnReason, setReturnReason] = useState('WRONG_SIZE');
  const [returnNotes,  setReturnNotes]  = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Carrega/recarrega pedido + rastreio
  async function carregarPedido(id: string) {
    try {
      const [orderRes, shipRes] = await Promise.all([
        api.get(`/orders/${id}`),
        api.get(`/shipments/order/${id}`).catch(() => null),
      ]);
      setOrder(orderRes.data.data.order);
      if (shipRes?.data?.data?.shipment) setShipment(shipRes.data.data.shipment);
    } catch (e: any) {
      setErro(e?.response?.data?.error ?? 'Pedido não encontrado.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!match || !params?.id) return;
    carregarPedido(params.id);
  }, [params?.id]);

  async function cancelarPedido() {
    if (!order) return;
    if (!confirm('Tem certeza que deseja cancelar este pedido?')) return;
    try {
      await api.patch(`/orders/${order.id}/cancel`);
      if (params?.id) await carregarPedido(params.id);
    } catch (e: any) {
      alert(e?.response?.data?.error ?? 'Erro ao cancelar pedido.');
    }
  }

  async function solicitarDevolucao() {
    if (!order) return;
    setSubmittingReturn(true);
    try {
      const items = order.order_items.map(item => ({
        order_item_id:  item.id,
        variant_id:     item.variant_id,
        quantity:       item.quantity,
      }));

      await api.post('/returns', {
        order_id: order.id,
        reason:   returnReason,
        notes:    returnNotes || undefined,
        items,
      });

      setShowReturn(false);
      // Recarrega o pedido — o card de devolução aparece no lugar do formulário
      if (params?.id) await carregarPedido(params.id);
    } catch (e: any) {
      alert(e?.response?.data?.error ?? 'Erro ao solicitar devolução.');
    } finally {
      setSubmittingReturn(false);
    }
  }

  if (loading) return <p className="py-20 text-center text-muted-foreground">Carregando pedido...</p>;

  if (erro || !order) return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <p className="text-4xl">⚠️</p>
      <p className="text-muted-foreground">{erro ?? 'Pedido não encontrado.'}</p>
      <Link href="/orders" className="bg-primary px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-primary-foreground hover:opacity-80">
        Ver todos os pedidos
      </Link>
    </div>
  );

  const snapshot = order.shipping_address_snapshot ?? {};
  // Cliente pode cancelar enquanto o pedido não foi enviado
  const podeCancelar = ['PENDING', 'CONFIRMED'].includes(order.status);
  // Devolução mais recente (se houver)
  const devolucoes     = order.returns ?? [];
  const devolucaoAtiva = devolucoes.find(r => ['REQUESTED', 'APPROVED', 'RECEIVED'].includes(r.status)) ?? null;
  const ultimaDevolucao = devolucoes.length > 0
    ? [...devolucoes].sort((a, b) => b.id - a.id)[0]
    : null;
  const podeDevolver = ['DELIVERED', 'SHIPPED', 'CONFIRMED', 'PROCESSING'].includes(order.status)
    && !devolucaoAtiva
    && !['REFUNDED', 'EXCHANGED'].includes(ultimaDevolucao?.status ?? '');

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">

      {/* Cabeçalho */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link href="/orders" className="text-xs text-muted-foreground hover:underline">← Meus pedidos</Link>
          <h1 className="mt-1 text-xl font-semibold text-foreground">{order.order_number}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(order.created_at).toLocaleDateString('pt-BR', {
              day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[order.status] ?? 'bg-secondary text-muted-foreground'}`}>
            {STATUS_LABEL[order.status] ?? order.status}
          </span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[order.payment_status] ?? 'bg-secondary text-muted-foreground'}`}>
            Pagamento: {PAYMENT_LABEL[order.payment_status] ?? order.payment_status}
          </span>
        </div>
      </div>

      <div className="space-y-5">

        {/* ── Itens ──────────────────────────────────────────────────────── */}
        <div className="border border-border bg-card">
          <p className="px-5 py-3 text-sm font-semibold text-foreground border-b border-border">Itens</p>
          <div className="divide-y divide-border">
            {order.order_items.map(item => {
              // Imagem e nome viram link para o produto quando temos o slug
              const Imagem = item.product_image_url
                ? <img src={item.product_image_url} alt={item.product_name} className="h-16 w-14 rounded-lg object-cover bg-secondary shrink-0" />
                : <div className="h-16 w-14 rounded-lg bg-secondary shrink-0" />;
              return (
                <div key={item.id} className="flex gap-4 p-4">
                  {item.product_slug
                    ? <Link href={`/products/${item.product_slug}`} className="shrink-0 hover:opacity-80 transition">{Imagem}</Link>
                    : Imagem}
                  <div className="flex flex-1 justify-between">
                    <div>
                      {item.product_slug
                        ? <Link href={`/products/${item.product_slug}`} className="text-sm font-medium text-foreground hover:underline">{item.product_name}</Link>
                        : <p className="text-sm font-medium text-foreground">{item.product_name}</p>}
                      {Object.entries(item.variant_attributes).map(([k, v]) => (
                        <p key={k} className="text-xs text-muted-foreground">{k}: {v}</p>
                      ))}
                      <p className="text-xs text-muted-foreground mt-0.5">SKU: {item.variant_sku}</p>
                      <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-foreground shrink-0">{formatarReal(item.total_price)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Rastreio ──────────────────────────────────────────────────── */}
        {shipment && (
          <div className="border border-border bg-card p-5">
            <p className="mb-3 text-sm font-semibold text-foreground">🚚 Rastreio</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transportadora</span>
                <span className="font-medium text-foreground">{shipment.carrier}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Código</span>
                <span className="font-mono text-foreground font-semibold">{shipment.tracking_code}</span>
              </div>
              {shipment.estimated_delivery && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Previsão de entrega</span>
                  <span className="text-foreground">
                    {new Date(shipment.estimated_delivery).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}
              {shipment.shipped_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Enviado em</span>
                  <span className="text-foreground">{new Date(shipment.shipped_at).toLocaleDateString('pt-BR')}</span>
                </div>
              )}
            </div>
            {shipment.tracking_url && (
              <a
                href={shipment.tracking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary transition"
              >
                Rastrear no site da transportadora →
              </a>
            )}
          </div>
        )}

        {/* ── Endereço + Totais ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="border border-border bg-card p-5">
            <p className="mb-2 text-sm font-semibold text-foreground">Endereço de entrega</p>
            <div className="text-sm text-muted-foreground space-y-0.5">
              {snapshot.recipient_name && <p className="font-medium text-foreground">{snapshot.recipient_name}</p>}
              {snapshot.street && <p>{snapshot.street}, {snapshot.number}{snapshot.complement ? ` — ${snapshot.complement}` : ''}</p>}
              {snapshot.neighborhood && <p>{snapshot.neighborhood}</p>}
              {snapshot.city && <p>{snapshot.city}{snapshot.state ? ` — ${snapshot.state}` : ''}, {snapshot.zip_code}</p>}
            </div>
          </div>

          <div className="border border-border bg-card p-5">
            <p className="mb-2 text-sm font-semibold text-foreground">Resumo</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatarReal(order.subtotal)}</span></div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-success"><span>Desconto</span><span>− {formatarReal(order.discount_amount)}</span></div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Frete</span>
                <span>{order.shipping_cost === 0 ? 'Grátis' : formatarReal(order.shipping_cost)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-foreground">
                <span>Total</span><span>{formatarReal(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Histórico de status ──────────────────────────────────────── */}
        {order.order_status_history.length > 0 && (
          <div className="border border-border bg-card p-5">
            <p className="mb-3 text-sm font-semibold text-foreground">Histórico</p>
            <div className="space-y-3">
              {[...order.order_status_history].reverse().map((h, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <span className={`shrink-0 mt-0.5 text-xs px-2 py-0.5 rounded-full font-medium h-fit ${STATUS_COLOR[h.status] ?? 'bg-secondary text-muted-foreground'}`}>
                    {STATUS_LABEL[h.status] ?? h.status}
                  </span>
                  <div>
                    {h.notes && <p className="text-muted-foreground">{h.notes}</p>}
                    <p className="text-xs text-muted-foreground">{formatarDataHora(h.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Cancelar pedido ──────────────────────────────────────────── */}
        {podeCancelar && (
          <div className="flex justify-end">
            <button
              onClick={cancelarPedido}
              className="border border-destructive/40 px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-destructive hover:bg-destructive/10 transition"
            >
              Cancelar pedido
            </button>
          </div>
        )}

        {/* ── Pagar agora ──────────────────────────────────────────────── */}
        {order.payment_status === 'PENDING' && (
          <div className="border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="font-display text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-1">⏳ Aguardando pagamento</p>
            <p className="text-xs text-muted-foreground mb-3">
              Seu pedido foi criado mas ainda não foi pago.
            </p>
            <button
              onClick={() => navigate(`/payment/${order.id}`)}
              className="bg-primary px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-primary-foreground hover:opacity-80 transition"
            >
              Pagar agora
            </button>
          </div>
        )}

        {/* ── Status da devolução existente ────────────────────────────── */}
        {ultimaDevolucao && (
          <div className="border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-foreground">↩ Devolução / Troca</p>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${RETURN_STATUS_COLOR[ultimaDevolucao.status] ?? 'bg-secondary text-muted-foreground'}`}>
                {RETURN_STATUS_LABEL[ultimaDevolucao.status] ?? ultimaDevolucao.status}
              </span>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Motivo</span>
                <span className="text-foreground">
                  {RAZOES_DEVOLUCAO.find(r => r.value === ultimaDevolucao.reason)?.label ?? ultimaDevolucao.reason}
                </span>
              </div>
              {ultimaDevolucao.notes && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground shrink-0">Observações</span>
                  <span className="text-foreground text-right">{ultimaDevolucao.notes}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Solicitada em</span>
                <span className="text-foreground">{new Date(ultimaDevolucao.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
              {ultimaDevolucao.refund_amount != null && (
                <div className="flex justify-between font-semibold text-success">
                  <span>Valor reembolsado</span>
                  <span>{formatarReal(Number(ultimaDevolucao.refund_amount))}</span>
                </div>
              )}
            </div>
            {ultimaDevolucao.status === 'REQUESTED' && (
              <p className="mt-3 border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                Sua solicitação está em análise. Você será notificado quando houver uma resposta (até 2 dias úteis).
              </p>
            )}
            {ultimaDevolucao.status === 'APPROVED' && (
              <p className="mt-3 border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-700 dark:text-blue-400">
                Devolução aprovada! Envie o produto de volta para concluir o processo.
              </p>
            )}
            <Link href="/returns" className="mt-3 inline-block text-xs text-muted-foreground hover:text-foreground">
              Ver todas as minhas devoluções →
            </Link>
          </div>
        )}

        {/* ── Solicitar devolução ──────────────────────────────────────── */}
        {podeDevolver && order.payment_status === 'PAID' && (
          <div className="border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-foreground">Devolução / Troca</p>
              <Link href="/returns" className="text-xs text-muted-foreground hover:text-foreground">Ver minhas devoluções</Link>
            </div>

            {!showReturn ? (
              <button
                onClick={() => setShowReturn(true)}
                className="mt-2 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-secondary transition"
              >
                Solicitar devolução ou troca
              </button>
            ) : (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Motivo</label>
                  <select
                    value={returnReason}
                    onChange={e => setReturnReason(e.target.value)}
                    className="w-full border border-input bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                  >
                    {RAZOES_DEVOLUCAO.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Observações (opcional)</label>
                  <textarea
                    value={returnNotes}
                    onChange={e => setReturnNotes(e.target.value)}
                    rows={2}
                    placeholder="Descreva o problema..."
                    className="w-full border border-input bg-background px-3 py-2 text-sm outline-none focus:border-foreground resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={solicitarDevolucao}
                    disabled={submittingReturn}
                    className="bg-primary px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-primary-foreground hover:opacity-80 disabled:opacity-50"
                  >
                    {submittingReturn ? 'Enviando...' : 'Enviar solicitação'}
                  </button>
                  <button
                    onClick={() => setShowReturn(false)}
                    className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-secondary"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
