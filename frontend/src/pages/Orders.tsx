import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { api } from '@/services/api';
import { formatarReal } from '@/utils';

// ── Tipos ─────────────────────────────────────────────────────────────────────

type OrderItem = {
  id: number;
  product_name: string;
  product_image_url: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  variant_attributes: Record<string, string>;
};

type Order = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  delivery_status: string;
  subtotal: number;
  discount_amount: number;
  shipping_cost: number;
  total: number;
  created_at: string;
  order_items: OrderItem[];
  returns: { id: number; status: string }[];
};

const RETURN_BADGE: Record<string, { label: string; cor: string }> = {
  REQUESTED: { label: '↩ Devolução em análise', cor: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
  APPROVED:  { label: '↩ Devolução aprovada',   cor: 'bg-blue-500/15 text-blue-700 dark:text-blue-400' },
  RECEIVED:  { label: '↩ Produto recebido',     cor: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400' },
  REFUNDED:  { label: '↩ Reembolsada',          cor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
  EXCHANGED: { label: '↩ Trocada',              cor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
  REJECTED:  { label: '↩ Devolução recusada',   cor: 'bg-red-500/15 text-red-600 dark:text-red-400' },
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

const STATUS_COLOR: Record<string, string> = {
  PENDING:    'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  CONFIRMED:  'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  PROCESSING: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  SHIPPED:    'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400',
  DELIVERED:  'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  CANCELLED:  'bg-red-500/15 text-red-600 dark:text-red-400',
  REFUNDED:   'bg-secondary text-muted-foreground',
};

// ── Componente ────────────────────────────────────────────────────────────────

export function OrdersPage() {
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro,    setErro]    = useState<string | null>(null);
  const [page, setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    api.get(`/orders?page=${page}&limit=10`)
      .then(res => { setOrders(res.data.data.orders); setTotalPages(res.data.pagination.pages); })
      .catch(e  => setErro(e?.response?.data?.error ?? 'Erro ao carregar pedidos.'))
      .finally(()=> setLoading(false));
  }, [page]);

  if (loading) return <p className="py-20 text-center text-xs uppercase tracking-widest text-muted-foreground">Carregando pedidos...</p>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-8 font-display text-2xl font-bold uppercase tracking-tight border-b border-border pb-6">Meus pedidos</h1>

      {erro && (
        <p className="mb-4 border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{erro}</p>
      )}

      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">Você ainda não fez nenhum pedido.</p>
          <Link href="/" className="bg-primary px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-primary-foreground hover:opacity-80 transition">
            Ver produtos
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <Link key={order.id} href={`/orders/${order.id}`}>
              <div className="cursor-pointer border border-border bg-card p-5 hover:border-foreground transition">

                {/* Cabeçalho */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="font-display text-sm font-bold uppercase tracking-wide">{order.order_number}</p>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                      {new Date(order.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`text-[10px] px-2 py-1 font-bold uppercase tracking-widest ${STATUS_COLOR[order.status] ?? 'bg-secondary text-muted-foreground'}`}>
                      {STATUS_LABEL[order.status] ?? order.status}
                    </span>
                    {(order.returns ?? []).length > 0 && (() => {
                      const ultima = [...order.returns].sort((a, b) => b.id - a.id)[0];
                      const badge  = RETURN_BADGE[ultima.status];
                      return badge ? (
                        <span className={`text-[10px] px-2 py-1 font-bold uppercase tracking-widest ${badge.cor}`}>
                          {badge.label}
                        </span>
                      ) : null;
                    })()}
                  </div>
                </div>

                {/* Miniaturas dos itens */}
                <div className="flex gap-2 mb-4 overflow-hidden">
                  {order.order_items.slice(0, 4).map(item => (
                    <div key={item.id} className="relative shrink-0">
                      {item.product_image_url ? (
                        <img src={item.product_image_url} alt={item.product_name} className="h-16 w-[52px] object-cover bg-secondary" />
                      ) : (
                        <div className="h-16 w-[52px] bg-secondary" />
                      )}
                      {item.quantity > 1 && (
                        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-[9px] text-background font-bold">
                          {item.quantity}
                        </span>
                      )}
                    </div>
                  ))}
                  {order.order_items.length > 4 && (
                    <div className="h-16 w-[52px] bg-secondary flex items-center justify-center text-[10px] text-muted-foreground font-bold shrink-0">
                      +{order.order_items.length - 4}
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {order.order_items.reduce((a, i) => a + i.quantity, 0)} {order.order_items.reduce((a, i) => a + i.quantity, 0) === 1 ? 'item' : 'itens'}
                  </p>
                  <p className="font-mono text-sm font-bold">{formatarReal(order.total)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="border border-border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest disabled:opacity-40 hover:bg-secondary transition">← Anterior</button>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Página {page} de {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="border border-border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest disabled:opacity-40 hover:bg-secondary transition">Próxima →</button>
        </div>
      )}
    </div>
  );
}
