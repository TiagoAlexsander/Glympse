import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { api } from '@/services/api';
import { formatarReal } from '@/utils';

type Dashboard = {
  total_users: number;
  total_products: number;
  total_orders: number;
  receita_total: number;
  pedidos_por_status: Record<string, number>;
  pending_returns: number;
  pending_reviews: number;
  low_stock_items: number;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Aguardando pagamento', CONFIRMED: 'Confirmados', PROCESSING: 'Em separação',
  SHIPPED: 'Enviados', DELIVERED: 'Entregues', CANCELLED: 'Cancelados', REFUNDED: 'Reembolsados',
};

export function AdminDashboard() {
  const [data, setData]       = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard')
      .then(r => setData(r.data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="py-20 text-center text-muted-foreground">Carregando...</p>;
  if (!data)   return <p className="py-20 text-center text-muted-foreground">Erro ao carregar.</p>;

  return (
    <div className="max-w-5xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-semibold text-foreground">Painel administrativo</h1>
      <p className="mb-8 text-sm text-muted-foreground">Visão geral da sua loja.</p>

      {/* Cartões de resumo */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-8">
        <Card titulo="Receita confirmada" valor={formatarReal(data.receita_total)} cor="text-success" />
        <Card titulo="Pedidos" valor={String(data.total_orders)} cor="text-foreground" />
        <Card titulo="Produtos ativos" valor={String(data.total_products)} cor="text-foreground" />
        <Card titulo="Usuários" valor={String(data.total_users)} cor="text-foreground" />
      </div>

      {/* Avisos que precisam de ação */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <Aviso
          ativo={data.pending_returns > 0}
          href="/admin/returns"
          icone="↩️"
          texto={`${data.pending_returns} devolução(ões) aguardando análise`}
        />
        <Aviso
          ativo={data.pending_reviews > 0}
          href="/admin/reviews"
          icone="⭐"
          texto={`${data.pending_reviews} avaliação(ões) para aprovar`}
        />
        <Aviso
          ativo={data.low_stock_items > 0}
          href="/admin/inventory"
          icone="📊"
          texto={`${data.low_stock_items} item(ns) com estoque baixo`}
        />
      </div>

      {/* Pedidos por status */}
      <div className="border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Pedidos por status</h2>
        <div className="space-y-2">
          {Object.keys(STATUS_LABEL).map(status => {
            const qtd = data.pedidos_por_status[status] ?? 0;
            if (qtd === 0) return null;
            return (
              <Link key={status} href={`/admin/orders?status=${status}`}>
                <div className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-secondary cursor-pointer">
                  <span className="text-sm text-muted-foreground">{STATUS_LABEL[status]}</span>
                  <span className="text-sm font-semibold text-foreground">{qtd}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Card({ titulo, valor, cor }: { titulo: string; valor: string; cor: string }) {
  return (
    <div className="border border-border bg-card p-5">
      <p className="text-xs text-muted-foreground mb-1">{titulo}</p>
      <p className={`text-2xl font-bold ${cor}`}>{valor}</p>
    </div>
  );
}

function Aviso({ ativo, href, icone, texto }: { ativo: boolean; href: string; icone: string; texto: string }) {
  if (!ativo) return (
    <div className="border border-border bg-card p-4 text-sm text-muted-foreground">
      <span className="mr-2">{icone}</span>Tudo em dia
    </div>
  );
  return (
    <Link href={href}>
      <div className="border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 cursor-pointer transition">
        <span className="mr-2">{icone}</span>{texto} →
      </div>
    </Link>
  );
}
