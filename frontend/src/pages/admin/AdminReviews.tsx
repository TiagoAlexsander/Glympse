import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { api } from '@/services/api';
import { formatarData } from '@/utils';

type PendingReview = {
  id: number;
  rating: number;
  title: string | null;
  body: string | null;
  verified_purchase: boolean;
  owner_reply: string | null;
  created_at: string;
  users: { display_name: string | null; first_name: string } | null;
  products: { id: number; name: string; slug: string } | null;
};

function Stars({ n }: { n: number }) {
  return <span className="text-yellow-400">{'★'.repeat(n)}<span className="text-muted-foreground/30">{'★'.repeat(5 - n)}</span></span>;
}

export function AdminReviews() {
  const [reviews, setReviews] = useState<PendingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState<number | null>(null);

  async function carregar() {
    setLoading(true);
    try {
      const r = await api.get('/reviews/pending?limit=50');
      setReviews(r.data.data.reviews);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { carregar(); }, []);

  async function aprovar(id: number) {
    setSalvando(id);
    try {
      await api.patch(`/reviews/${id}/approve`);
      await carregar();
    } catch (e: any) {
      alert(e?.response?.data?.error ?? 'Erro.');
    } finally {
      setSalvando(null);
    }
  }

  async function recusar(id: number) {
    if (!confirm('Excluir esta avaliação? Esta ação não pode ser desfeita.')) return;
    setSalvando(id);
    try {
      await api.delete(`/reviews/${id}`);
      await carregar();
    } catch (e: any) {
      alert(e?.response?.data?.error ?? 'Erro.');
    } finally {
      setSalvando(null);
    }
  }

  async function responder(id: number) {
    const reply = prompt('Resposta da loja a esta avaliação:');
    if (!reply?.trim()) return;
    setSalvando(id);
    try {
      await api.patch(`/reviews/${id}/reply`, { reply });
      alert('Resposta salva. Ela aparece junto à avaliação no produto.');
      await carregar();
    } catch (e: any) {
      alert(e?.response?.data?.error ?? 'Erro.');
    } finally {
      setSalvando(null);
    }
  }

  return (
    <div className="max-w-3xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-semibold text-foreground">Avaliações pendentes</h1>
      <p className="mb-6 text-sm text-muted-foreground">Avaliações aguardando sua aprovação para aparecerem na loja.</p>

      {loading ? (
        <p className="text-center text-muted-foreground py-20">Carregando...</p>
      ) : reviews.length === 0 ? (
        <div className="border border-border bg-card p-10 text-center text-muted-foreground">
          ✓ Nenhuma avaliação pendente. Tudo aprovado!
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(r => (
            <div key={r.id} className="border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  {r.products
                    ? <Link href={`/products/${r.products.slug}`} className="text-sm font-semibold text-foreground hover:underline">{r.products.name}</Link>
                    : <span className="text-sm font-semibold text-foreground">Produto removido</span>}
                  <p className="text-xs text-muted-foreground">
                    {r.users?.display_name ?? r.users?.first_name ?? 'Anônimo'} · {formatarData(r.created_at)}
                    {r.verified_purchase && <span className="ml-2 text-success">✓ Compra verificada</span>}
                  </p>
                </div>
                <Stars n={r.rating} />
              </div>

              {r.title && <p className="text-sm font-medium text-foreground">{r.title}</p>}
              {r.body && <p className="text-sm text-muted-foreground mt-0.5">{r.body}</p>}
              {r.owner_reply && (
                <p className="mt-2 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
                  <strong>Resposta da loja:</strong> {r.owner_reply}
                </p>
              )}

              <div className="mt-3 flex gap-2">
                <button onClick={() => aprovar(r.id)} disabled={salvando === r.id}
                  className="rounded-lg bg-success px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                  ✓ Aprovar
                </button>
                <button onClick={() => responder(r.id)} disabled={salvando === r.id}
                  className="rounded-lg border border-border px-4 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary disabled:opacity-50">
                  Responder
                </button>
                <button onClick={() => recusar(r.id)} disabled={salvando === r.id}
                  className="rounded-lg border border-destructive/40 px-4 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50">
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
