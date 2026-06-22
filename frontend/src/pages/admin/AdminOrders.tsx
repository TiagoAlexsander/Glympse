import { useEffect, useState } from 'react';
import { Link, useSearch } from 'wouter';
import { api } from '@/services/api';
import { formatarReal, formatarData } from '@/utils';

type AdminOrder = {
  id: number;
  order_number: string;
  status: string;
  payment_status: string;
  total: number;
  created_at: string;
  users: { first_name: string; last_name: string | null; display_name: string | null } | null;
  order_items: { id: number }[];
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Aguardando pagamento', CONFIRMED: 'Confirmado', PROCESSING: 'Em separação',
  SHIPPED: 'Enviado', DELIVERED: 'Entregue', CANCELLED: 'Cancelado', REFUNDED: 'Reembolsado',
};
const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-amber-500/15 text-amber-700 dark:text-amber-400', CONFIRMED: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  PROCESSING: 'bg-blue-500/15 text-blue-700 dark:text-blue-400', SHIPPED: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400',
  DELIVERED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400', CANCELLED: 'bg-red-500/15 text-red-600 dark:text-red-400',
  REFUNDED: 'bg-secondary text-muted-foreground',
};

export function AdminOrders() {
  const searchString = useSearch();
  const statusInicial = new URLSearchParams(searchString).get('status') ?? '';

  const [orders, setOrders]   = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus]   = useState(statusInicial);
  const [busca, setBusca]     = useState('');
  const [page, setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (status) params.set('status', status);
    if (busca)  params.set('search', busca);

    api.get(`/orders/admin/all?${params.toString()}`)
      .then(r => {
        setOrders(r.data.data.orders);
        setTotalPages(r.data.pagination.pages);
      })
      .finally(() => setLoading(false));
  }, [status, busca, page]);

  function nomeCliente(o: AdminOrder) {
    if (!o.users) return '—';
    return o.users.display_name || `${o.users.first_name} ${o.users.last_name ?? ''}`.trim();
  }

  return (
    <div className="max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Pedidos</h1>

      {/* Filtros */}
      <div className="mb-5 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar nº do pedido..."
          value={busca}
          onChange={e => { setBusca(e.target.value); setPage(1); }}
          className="rounded-lg border border-input px-3 py-2 text-sm outline-none focus:border-foreground w-56"
        />
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="rounded-lg border border-input px-3 py-2 text-sm outline-none focus:border-foreground"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-20">Carregando...</p>
      ) : orders.length === 0 ? (
        <p className="text-center text-muted-foreground py-20">Nenhum pedido encontrado.</p>
      ) : (
        <div className="border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Pedido</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cliente</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map(o => (
                <tr key={o.id} className="hover:bg-secondary transition">
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${o.id}`} className="font-medium text-foreground hover:underline">
                      {o.order_number}
                    </Link>
                    <p className="text-xs text-muted-foreground">{o.order_items.length} item(ns)</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{nomeCliente(o)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatarData(o.created_at)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[o.status] ?? 'bg-secondary'}`}>
                      {STATUS_LABEL[o.status] ?? o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">{formatarReal(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-secondary"
          >← Anterior</button>
          <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-secondary"
          >Próxima →</button>
        </div>
      )}
    </div>
  );
}
