import { useEffect, useState } from 'react';
import { Link, useRoute } from 'wouter';
import { api } from '@/services/api';

type Produto = {
  id: number;
  name: string;
  slug: string;
  image?: string | null;
  product_images?: { url: string }[];
};

export function AdminCollectionDetail() {
  const [, params] = useRoute<{ id: string }>('/admin/collections/:id');
  const id = params?.id;

  const [nome, setNome] = useState('');
  const [naColecao, setNaColecao] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);

  // Busca para adicionar
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<Produto[]>([]);
  const [buscando, setBuscando] = useState(false);

  async function carregar() {
    if (!id) return;
    setLoading(true);
    try {
      const r = await api.get(`/collections/${id}/products`);
      setNome(r.data.data.collection?.name ?? '');
      setNaColecao(r.data.data.products ?? []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { carregar(); }, [id]);

  // Busca produtos para adicionar (exclui os que já estão na coleção)
  useEffect(() => {
    if (!busca.trim()) { setResultados([]); return; }
    const t = setTimeout(async () => {
      setBuscando(true);
      try {
        const r = await api.get(`/products/admin/list?search=${encodeURIComponent(busca)}&limit=20`);
        const idsNaColecao = new Set(naColecao.map(p => p.id));
        setResultados((r.data.data.products as Produto[]).filter(p => !idsNaColecao.has(p.id)));
      } finally {
        setBuscando(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [busca, naColecao]);

  async function adicionar(produtoId: number) {
    await api.post(`/collections/${id}/products`, { product_id: produtoId });
    await carregar();
    setBusca(''); setResultados([]);
  }
  async function remover(produtoId: number) {
    await api.delete(`/collections/${id}/products/${produtoId}`);
    await carregar();
  }

  function imgDe(p: Produto): string | null {
    return p.image ?? p.product_images?.[0]?.url ?? null;
  }

  if (loading) return <p className="py-20 text-center text-stone-400">Carregando...</p>;

  return (
    <div className="max-w-3xl px-4 py-8">
      <Link href="/admin/collections" className="text-xs text-stone-400 hover:underline">← Todas as coleções</Link>
      <h1 className="mt-1 mb-6 text-2xl font-semibold text-stone-900">{nome}</h1>

      {/* Adicionar produtos */}
      <div className="mb-6 rounded-xl border border-stone-200 bg-white p-5">
        <p className="mb-3 text-sm font-semibold text-stone-700">Adicionar produtos</p>
        <input
          type="text"
          placeholder="Buscar produto pelo nome..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
        />
        {busca.trim() && (
          <div className="mt-3 space-y-2">
            {buscando ? (
              <p className="text-sm text-stone-400">Buscando...</p>
            ) : resultados.length === 0 ? (
              <p className="text-sm text-stone-400">Nenhum produto novo encontrado.</p>
            ) : resultados.map(p => (
              <div key={p.id} className="flex items-center gap-3 rounded-lg border border-stone-100 p-2">
                {imgDe(p)
                  ? <img src={imgDe(p)!} className="h-10 w-9 rounded object-cover bg-stone-100 shrink-0" />
                  : <div className="h-10 w-9 rounded bg-stone-100 shrink-0" />}
                <span className="flex-1 text-sm text-stone-700 line-clamp-1">{p.name}</span>
                <button onClick={() => adicionar(p.id)}
                  className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-700">
                  + Adicionar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Produtos na coleção */}
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <p className="mb-3 text-sm font-semibold text-stone-700">Produtos nesta coleção ({naColecao.length})</p>
        {naColecao.length === 0 ? (
          <p className="text-sm text-stone-400">Nenhum produto ainda. Use a busca acima para adicionar.</p>
        ) : (
          <div className="space-y-2">
            {naColecao.map(p => (
              <div key={p.id} className="flex items-center gap-3 rounded-lg border border-stone-100 p-2">
                {imgDe(p)
                  ? <img src={imgDe(p)!} className="h-10 w-9 rounded object-cover bg-stone-100 shrink-0" />
                  : <div className="h-10 w-9 rounded bg-stone-100 shrink-0" />}
                <Link href={`/admin/products/${p.id}`} className="flex-1 text-sm text-stone-700 hover:underline line-clamp-1">
                  {p.name}
                </Link>
                <button onClick={() => remover(p.id)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50">
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
