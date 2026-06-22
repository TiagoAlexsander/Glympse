import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { formatarReal, formatarData } from '@/utils';

type ReturnItem = {
  id: number;
  quantity: number;
  order_items: { product_name: string; unit_price: number } | null;
};
type AdminReturn = {
  id: number;
  status: string;
  reason: string;
  notes: string | null;
  refund_amount: number | null;
  valor_itens: number;
  created_at: string;
  orders: { order_number: string; total: number } | null;
  users: { display_name: string | null; first_name: string } | null;
  return_items: ReturnItem[];
};

const REASON_LABEL: Record<string, string> = {
  WRONG_SIZE: 'Tamanho errado', WRONG_PRODUCT: 'Produto errado', DEFECTIVE: 'Defeito',
  NOT_AS_DESCRIBED: 'Diferente do descrito', CHANGED_MIND: 'Mudou de ideia', OTHER: 'Outro',
};
const STATUS_LABEL: Record<string, string> = {
  REQUESTED: 'Em análise', APPROVED: 'Aprovada', REJECTED: 'Recusada',
  RECEIVED: 'Produto recebido', REFUNDED: 'Reembolsada', EXCHANGED: 'Trocada',
};
const STATUS_COLOR: Record<string, string> = {
  REQUESTED: 'bg-amber-500/15 text-amber-700 dark:text-amber-400', APPROVED: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  REJECTED: 'bg-red-500/15 text-red-600 dark:text-red-400', RECEIVED: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400',
  REFUNDED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400', EXCHANGED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
};

export function AdminReturns() {
  const [returns, setReturns] = useState<AdminReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro]   = useState('');
  const [salvando, setSalvando] = useState<number | null>(null);

  async function carregar() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (filtro) params.set('status', filtro);
      const r = await api.get(`/returns/admin/all?${params.toString()}`);
      setReturns(r.data.data.returns);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { carregar(); }, [filtro]);

  async function atualizar(id: number, status: string, sugestao?: number) {
    let refund_amount: number | undefined;
    if (status === 'REFUNDED') {
      // Sugere o valor dos itens devolvidos como padrão
      const valor = prompt('Valor do reembolso (R$):', sugestao != null ? String(sugestao) : '');
      if (valor === null) return;
      refund_amount = parseFloat(valor.replace(',', '.'));
      if (isNaN(refund_amount)) { alert('Valor inválido.'); return; }
    } else {
      if (!confirm(`Mudar status para "${STATUS_LABEL[status]}"?`)) return;
    }
    setSalvando(id);
    try {
      await api.patch(`/returns/${id}/status`, { status, refund_amount });
      await carregar();
    } catch (e: any) {
      alert(e?.response?.data?.error ?? 'Erro.');
    } finally {
      setSalvando(null);
    }
  }

  // Próximas ações possíveis por status atual
  function acoes(status: string): { label: string; novo: string; cor: string }[] {
    switch (status) {
      case 'REQUESTED': return [
        { label: 'Aprovar', novo: 'APPROVED', cor: 'bg-primary' },
        { label: 'Recusar', novo: 'REJECTED', cor: 'bg-destructive' },
      ];
      case 'APPROVED': return [
        { label: 'Marcar recebido', novo: 'RECEIVED', cor: 'bg-primary' },
      ];
      case 'RECEIVED': return [
        { label: 'Reembolsar', novo: 'REFUNDED', cor: 'bg-success' },
        { label: 'Marcar trocado', novo: 'EXCHANGED', cor: 'bg-success' },
      ];
      default: return [];
    }
  }

  return (
    <div className="max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Devoluções</h1>

      <div className="mb-5 flex gap-2 flex-wrap">
        <button onClick={() => setFiltro('')}
          className={`rounded-lg px-3 py-1.5 text-sm ${filtro === '' ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground'}`}>
          Todas
        </button>
        {Object.entries(STATUS_LABEL).map(([k, v]) => (
          <button key={k} onClick={() => setFiltro(k)}
            className={`rounded-lg px-3 py-1.5 text-sm ${filtro === k ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground'}`}>
            {v}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-20">Carregando...</p>
      ) : returns.length === 0 ? (
        <p className="text-center text-muted-foreground py-20">Nenhuma devolução.</p>
      ) : (
        <div className="space-y-3">
          {returns.map(r => (
            <div key={r.id} className="border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {r.orders?.order_number ?? `Devolução #${r.id}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.users?.display_name ?? r.users?.first_name ?? '—'} · {formatarData(r.created_at)} · {r.return_items.length} item(ns)
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[r.status]}`}>
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Motivo: <strong>{REASON_LABEL[r.reason] ?? r.reason}</strong>
              </p>
              {r.notes && <p className="text-sm text-muted-foreground mt-0.5">"{r.notes}"</p>}

              {/* Itens devolvidos com preço */}
              <div className="mt-2 rounded-lg bg-secondary px-3 py-2 space-y-1">
                {r.return_items.map(it => (
                  <div key={it.id} className="flex justify-between text-xs text-muted-foreground">
                    <span>{it.quantity}× {it.order_items?.product_name ?? 'Item'}</span>
                    <span>{formatarReal((it.order_items?.unit_price ?? 0) * it.quantity)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs font-semibold text-foreground border-t border-border pt-1 mt-1">
                  <span>Valor dos itens devolvidos</span>
                  <span>{formatarReal(r.valor_itens)}</span>
                </div>
                {r.orders && (
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Total do pedido</span>
                    <span>{formatarReal(r.orders.total)}</span>
                  </div>
                )}
              </div>

              {r.refund_amount != null && (
                <p className="text-sm text-success font-medium mt-1.5">Reembolsado: {formatarReal(r.refund_amount)}</p>
              )}

              {acoes(r.status).length > 0 && (
                <div className="mt-3 flex gap-2">
                  {acoes(r.status).map(a => (
                    <button
                      key={a.novo}
                      onClick={() => atualizar(r.id, a.novo, r.valor_itens)}
                      disabled={salvando === r.id}
                      className={`rounded-lg ${a.cor} px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
