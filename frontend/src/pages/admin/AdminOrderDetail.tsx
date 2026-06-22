import { useEffect, useState } from 'react';
import { Link, useRoute } from 'wouter';
import { api } from '@/services/api';
import { formatarReal, formatarDataHora } from '@/utils';

type Item = {
  id: number; product_name: string; variant_sku: string; product_slug: string | null;
  variant_attributes: Record<string, string>; product_image_url: string | null;
  quantity: number; unit_price: number; total_price: number;
};
type Shipment = {
  id: number; carrier: string; tracking_code: string; status: string;
  shipped_at: string | null; delivered_at: string | null;
};
type Order = {
  id: number; order_number: string; status: string; payment_status: string;
  subtotal: number; discount_amount: number; shipping_cost: number; total: number;
  created_at: string;
  shipping_address_snapshot: any;
  users: { first_name: string; last_name: string | null; display_name: string | null; phone: string | null } | null;
  order_items: Item[];
  order_status_history: { status: string; notes: string | null; created_at: string }[];
  shipments: Shipment[];
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Aguardando pagamento', CONFIRMED: 'Confirmado', PROCESSING: 'Em separação',
  SHIPPED: 'Enviado', DELIVERED: 'Entregue', CANCELLED: 'Cancelado', REFUNDED: 'Reembolsado',
};

export function AdminOrderDetail() {
  const [, params] = useRoute<{ id: string }>('/admin/orders/:id');
  const id = params?.id;

  const [order, setOrder]     = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Form de envio
  const [showShip, setShowShip] = useState(false);
  const [carrier, setCarrier]   = useState('Correios');
  const [tracking, setTracking] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');

  async function carregar() {
    if (!id) return;
    setLoading(true);
    try {
      const r = await api.get(`/orders/admin/${id}`);
      setOrder(r.data.data.order);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { carregar(); }, [id]);

  async function mudarStatus(novo: string) {
    if (!order) return;
    if (!confirm(`Mudar o status do pedido para "${STATUS_LABEL[novo]}"?`)) return;
    setSalvando(true);
    try {
      await api.patch(`/orders/admin/${order.id}/status`, { status: novo });
      await carregar();
    } catch (e: any) {
      alert(e?.response?.data?.error ?? 'Erro ao mudar status.');
    } finally {
      setSalvando(false);
    }
  }

  async function criarEnvio() {
    if (!order || !tracking.trim()) { alert('Informe o código de rastreio.'); return; }
    setSalvando(true);
    try {
      await api.post('/shipments', {
        order_id: order.id, carrier, tracking_code: tracking.trim(),
        tracking_url: trackingUrl.trim() || undefined,
      });
      setShowShip(false); setTracking(''); setTrackingUrl('');
      await carregar();
    } catch (e: any) {
      alert(e?.response?.data?.error ?? 'Erro ao criar envio.');
    } finally {
      setSalvando(false);
    }
  }

  async function marcarEntregue(shipmentId: number) {
    if (!confirm('Marcar este envio como ENTREGUE?')) return;
    setSalvando(true);
    try {
      await api.patch(`/shipments/${shipmentId}`, { status: 'DELIVERED' });
      await carregar();
    } catch (e: any) {
      alert(e?.response?.data?.error ?? 'Erro.');
    } finally {
      setSalvando(false);
    }
  }

  if (loading) return <p className="py-20 text-center text-muted-foreground">Carregando...</p>;
  if (!order)  return <p className="py-20 text-center text-muted-foreground">Pedido não encontrado.</p>;

  const cliente = order.users
    ? (order.users.display_name || `${order.users.first_name} ${order.users.last_name ?? ''}`.trim())
    : '—';
  const snap = order.shipping_address_snapshot ?? {};
  const envio = order.shipments?.[0] ?? null;

  return (
    <div className="max-w-3xl px-4 py-8">
      <Link href="/admin/orders" className="text-xs text-muted-foreground hover:underline">← Todos os pedidos</Link>
      <div className="mt-1 mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">{order.order_number}</h1>
        <span className="rounded-full bg-secondary px-3 py-1 text-sm font-medium text-foreground">
          {STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>

      {/* ── Ações de status ── */}
      <div className="mb-6 border border-border bg-card p-5">
        <p className="mb-3 text-sm font-semibold text-foreground">Alterar status do pedido</p>
        <div className="flex flex-wrap gap-2">
          {['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map(s => (
            <button
              key={s}
              onClick={() => mudarStatus(s)}
              disabled={salvando || order.status === s}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-40 ${
                order.status === s
                  ? 'border-foreground bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:bg-secondary'
              }`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">O cliente é notificado automaticamente a cada mudança.</p>
      </div>

      {/* ── Rastreio / envio ── */}
      <div className="mb-6 border border-border bg-card p-5">
        <p className="mb-3 text-sm font-semibold text-foreground">🚚 Envio e rastreio</p>
        {envio ? (
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Transportadora</span><span className="text-foreground">{envio.carrier}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Código</span><span className="font-mono text-foreground">{envio.tracking_code}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Situação</span><span className="text-foreground">{envio.status}</span></div>
            {envio.status !== 'DELIVERED' && (
              <button
                onClick={() => marcarEntregue(envio.id)}
                disabled={salvando}
                className="mt-3 rounded-lg bg-success px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                ✓ Marcar como entregue
              </button>
            )}
          </div>
        ) : !showShip ? (
          <button
            onClick={() => setShowShip(true)}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-secondary"
          >
            + Registrar envio / rastreio
          </button>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input value={carrier} onChange={e => setCarrier(e.target.value)} placeholder="Transportadora"
                className="rounded-lg border border-input px-3 py-2 text-sm outline-none focus:border-foreground" />
              <input value={tracking} onChange={e => setTracking(e.target.value)} placeholder="Código de rastreio *"
                className="rounded-lg border border-input px-3 py-2 text-sm outline-none focus:border-foreground" />
            </div>
            <input value={trackingUrl} onChange={e => setTrackingUrl(e.target.value)} placeholder="URL de rastreio (opcional)"
              className="w-full rounded-lg border border-input px-3 py-2 text-sm outline-none focus:border-foreground" />
            <div className="flex gap-2">
              <button onClick={criarEnvio} disabled={salvando}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-80 disabled:opacity-50">
                {salvando ? 'Salvando...' : 'Registrar envio'}
              </button>
              <button onClick={() => setShowShip(false)}
                className="rounded-lg border border-border px-4 py-2 text-xs text-muted-foreground hover:bg-secondary">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Cliente + pagamento ── */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="border border-border bg-card p-5">
          <p className="mb-2 text-sm font-semibold text-foreground">Cliente</p>
          <p className="text-sm text-foreground">{cliente}</p>
          {order.users?.phone && <p className="text-sm text-muted-foreground">{order.users.phone}</p>}
          <div className="mt-3 text-sm text-muted-foreground space-y-0.5">
            {snap.recipient_name && <p className="text-foreground">{snap.recipient_name}</p>}
            {snap.street && <p>{snap.street}, {snap.number}</p>}
            {snap.city && <p>{snap.neighborhood} — {snap.city}/{snap.state}</p>}
            {snap.zip_code && <p>CEP {snap.zip_code}</p>}
          </div>
        </div>
        <div className="border border-border bg-card p-5">
          <p className="mb-2 text-sm font-semibold text-foreground">Pagamento</p>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatarReal(order.subtotal)}</span></div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-success"><span>Desconto</span><span>− {formatarReal(order.discount_amount)}</span></div>
            )}
            <div className="flex justify-between text-muted-foreground"><span>Frete</span><span>{order.shipping_cost === 0 ? 'Grátis' : formatarReal(order.shipping_cost)}</span></div>
            <div className="border-t pt-1.5 flex justify-between font-bold text-foreground"><span>Total</span><span>{formatarReal(order.total)}</span></div>
            <p className="text-xs text-muted-foreground pt-1">Status do pagamento: {order.payment_status}</p>
          </div>
        </div>
      </div>

      {/* ── Itens ── */}
      <div className="mb-6 border border-border bg-card">
        <p className="px-5 py-3 text-sm font-semibold text-foreground border-b border-border">Itens</p>
        <div className="divide-y divide-border">
          {order.order_items.map(item => (
            <div key={item.id} className="flex gap-4 p-4">
              {item.product_image_url
                ? <img src={item.product_image_url} className="h-14 w-12 rounded-lg object-cover bg-secondary shrink-0" />
                : <div className="h-14 w-12 rounded-lg bg-secondary shrink-0" />}
              <div className="flex flex-1 justify-between">
                <div>
                  {item.product_slug
                    ? <Link href={`/products/${item.product_slug}`} className="text-sm font-medium text-foreground hover:underline">{item.product_name}</Link>
                    : <p className="text-sm font-medium text-foreground">{item.product_name}</p>}
                  {Object.entries(item.variant_attributes).map(([k, v]) => (
                    <p key={k} className="text-xs text-muted-foreground">{k}: {v}</p>
                  ))}
                  <p className="text-xs text-muted-foreground">Qtd: {item.quantity} · SKU {item.variant_sku}</p>
                </div>
                <p className="text-sm font-semibold text-foreground shrink-0">{formatarReal(item.total_price)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Histórico ── */}
      <div className="border border-border bg-card p-5">
        <p className="mb-3 text-sm font-semibold text-foreground">Histórico</p>
        <div className="space-y-2">
          {[...order.order_status_history].reverse().map((h, i) => (
            <div key={i} className="flex gap-3 text-sm">
              <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground h-fit">
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
    </div>
  );
}
