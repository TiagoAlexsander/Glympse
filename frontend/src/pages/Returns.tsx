import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { api } from '@/services/api';
import { formatarReal } from '@/utils';

type ReturnItem = {
  id: number;
  quantity: number;
  reason: string | null;
  product_variants: { sku: string; products: { name: string } } | null;
};

type ReturnRecord = {
  id: number;
  status: string;
  reason: string;
  notes: string | null;
  refund_amount: number | null;
  created_at: string;
  orders: { id: number; order_number: string } | null;
  return_items: ReturnItem[];
};

const STATUS_LABEL: Record<string, string> = {
  REQUESTED: 'Solicitada',
  APPROVED:  'Aprovada',
  REJECTED:  'Rejeitada',
  RECEIVED:  'Recebida',
  REFUNDED:  'Reembolsada',
  EXCHANGED: 'Trocada',
};

const STATUS_COLOR: Record<string, string> = {
  REQUESTED: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  APPROVED:  'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  REJECTED:  'bg-red-500/15 text-red-600 dark:text-red-400',
  RECEIVED:  'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400',
  REFUNDED:  'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  EXCHANGED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
};

export function ReturnsPage() {
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/returns')
      .then(res => setReturns(res.data.data.returns ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="py-20 text-center text-xs uppercase tracking-widest text-muted-foreground">Carregando...</p>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-8 font-display text-2xl font-bold uppercase tracking-tight border-b border-border pb-6">Minhas devoluções</h1>

      {returns.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">Você não tem solicitações de devolução.</p>
          <Link href="/orders" className="bg-primary px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-primary-foreground hover:opacity-80 transition">
            Ver meus pedidos
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {returns.map(ret => (
            <div key={ret.id} className="border border-border bg-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-display text-sm font-bold uppercase tracking-wide">Devolução #{ret.id}</p>
                  {ret.orders && (
                    <Link href={`/orders/${ret.orders.id}`}>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground cursor-pointer mt-1">
                        Pedido {ret.orders.order_number}
                      </p>
                    </Link>
                  )}
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
                    {new Date(ret.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <span className={`text-[10px] px-2 py-1 font-bold uppercase tracking-widest ${STATUS_COLOR[ret.status] ?? 'bg-secondary text-muted-foreground'}`}>
                  {STATUS_LABEL[ret.status] ?? ret.status}
                </span>
              </div>

              <div className="space-y-1 mb-3 border-t border-border pt-3">
                {ret.return_items.map(item => (
                  <p key={item.id} className="text-sm text-muted-foreground">
                    {item.quantity}× {item.product_variants?.products?.name ?? '—'} <span className="text-xs">({item.product_variants?.sku})</span>
                  </p>
                ))}
              </div>

              {ret.notes && (
                <p className="text-xs text-muted-foreground italic">"{ret.notes}"</p>
              )}

              {ret.refund_amount && (
                <p className="mt-2 font-mono text-sm font-bold text-success">
                  Reembolso: {formatarReal(ret.refund_amount)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
