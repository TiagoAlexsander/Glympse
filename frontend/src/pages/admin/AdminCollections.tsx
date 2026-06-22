import { useEffect, useState } from 'react';
import { api } from '@/services/api';

type Collection = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  product_count: number;
};
type Produto = {
  id: number;
  name: string;
  image?: string | null;
  product_images?: { url: string }[];
};

function gerarSlug(nome: string): string {
  return nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function imgDe(p: Produto): string | null {
  return p.image ?? p.product_images?.[0]?.url ?? null;
}

// Painel de Coleções (usado dentro da página Catálogo)
export function AdminCollections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  // Criar nova coleção
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome]         = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Coleção expandida (gestão de produtos inline)
  const [expandida, setExpandida] = useState<number | null>(null);

  async function carregar() {
    setLoading(true);
    try {
      const r = await api.get('/collections/admin/all');
      setCollections(r.data.data.collections);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { carregar(); }, []);

  async function criar() {
    if (!nome.trim()) { alert('Informe o nome da coleção.'); return; }
    setSalvando(true);
    try {
      await api.post('/collections', {
        name: nome, slug: gerarSlug(nome) + '-' + Date.now().toString(36),
        image_url: imageUrl || null,
      });
      setNome(''); setImageUrl(''); setShowForm(false);
      await carregar();
    } catch (e: any) {
      alert(e?.response?.data?.error ?? 'Erro ao criar.');
    } finally {
      setSalvando(false);
    }
  }

  async function alternarVisibilidade(c: Collection) {
    await api.put(`/collections/${c.id}`, { is_active: !c.is_active });
    await carregar();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Agrupe produtos em coleções. As <strong>visíveis</strong> aparecem na loja.</p>
        <button onClick={() => setShowForm(v => !v)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-80">
          {showForm ? 'Cancelar' : '+ Nova coleção'}
        </button>
      </div>

      {showForm && (
        <div className="mb-4 border border-border bg-card p-4 space-y-3">
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome da coleção *"
            className="w-full rounded-lg border border-input px-3 py-2 text-sm outline-none focus:border-foreground" />
          <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="URL da imagem (opcional)"
            className="w-full rounded-lg border border-input px-3 py-2 text-sm outline-none focus:border-foreground" />
          <button onClick={criar} disabled={salvando}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-80 disabled:opacity-50">
            {salvando ? 'Criando...' : 'Criar coleção'}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-center text-muted-foreground py-12">Carregando...</p>
      ) : collections.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Nenhuma coleção ainda.</p>
      ) : (
        <div className="space-y-2">
          {collections.map(c => (
            <div key={c.id} className="border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-3 p-3">
                <button onClick={() => setExpandida(expandida === c.id ? null : c.id)}
                  className="flex flex-1 items-center gap-3 text-left">
                  <span className="text-muted-foreground">{expandida === c.id ? '▾' : '▸'}</span>
                  {c.image_url
                    ? <img src={c.image_url} className="h-10 w-10 rounded-lg object-cover bg-secondary shrink-0" />
                    : <div className="h-10 w-10 rounded-lg bg-secondary shrink-0 flex items-center justify-center">🗂️</div>}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{c.name}</span>
                      {c.is_active
                        ? <span className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-1.5 rounded">visível</span>
                        : <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 rounded">oculta</span>}
                    </div>
                    <span className="text-xs text-muted-foreground">{c.product_count} produto(s)</span>
                  </div>
                </button>
                <button onClick={() => alternarVisibilidade(c)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary shrink-0">
                  {c.is_active ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>

              {expandida === c.id && (
                <GestaoProdutos collectionId={c.id} onChange={carregar} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Gestão de produtos de uma coleção (inline)
function GestaoProdutos({ collectionId, onChange }: { collectionId: number; onChange: () => void }) {
  const [naColecao, setNaColecao] = useState<Produto[]>([]);
  const [loading, setLoading]     = useState(true);
  const [busca, setBusca]         = useState('');
  const [resultados, setResultados] = useState<Produto[]>([]);
  const [buscando, setBuscando]   = useState(false);

  async function carregar() {
    setLoading(true);
    try {
      const r = await api.get(`/collections/${collectionId}/products`);
      setNaColecao(r.data.data.products ?? []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { carregar(); }, [collectionId]);

  useEffect(() => {
    if (!busca.trim()) { setResultados([]); return; }
    const t = setTimeout(async () => {
      setBuscando(true);
      try {
        const r = await api.get(`/products/admin/list?search=${encodeURIComponent(busca)}&limit=20`);
        const ids = new Set(naColecao.map(p => p.id));
        setResultados((r.data.data.products as Produto[]).filter(p => !ids.has(p.id)));
      } finally {
        setBuscando(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [busca, naColecao]);

  async function adicionar(pid: number) {
    await api.post(`/collections/${collectionId}/products`, { product_id: pid });
    setBusca(''); setResultados([]);
    await carregar(); onChange();
  }
  async function remover(pid: number) {
    await api.delete(`/collections/${collectionId}/products/${pid}`);
    await carregar(); onChange();
  }

  return (
    <div className="border-t border-border bg-secondary/50 p-4">
      {/* Busca para adicionar */}
      <input
        type="text"
        placeholder="🔍 Buscar produto para adicionar..."
        value={busca}
        onChange={e => setBusca(e.target.value)}
        className="w-full rounded-lg border border-input px-3 py-2 text-sm outline-none focus:border-foreground bg-card"
      />
      {busca.trim() && (
        <div className="mt-2 space-y-1 rounded-lg border border-border bg-card p-2 max-h-52 overflow-y-auto">
          {buscando ? <p className="text-xs text-muted-foreground p-1">Buscando...</p>
            : resultados.length === 0 ? <p className="text-xs text-muted-foreground p-1">Nenhum produto novo encontrado.</p>
            : resultados.map(p => (
              <button key={p.id} onClick={() => adicionar(p.id)}
                className="flex w-full items-center gap-2 rounded-lg p-1.5 hover:bg-secondary text-left">
                {imgDe(p) ? <img src={imgDe(p)!} className="h-8 w-7 rounded object-cover bg-secondary shrink-0" /> : <div className="h-8 w-7 rounded bg-secondary shrink-0" />}
                <span className="flex-1 text-sm text-foreground line-clamp-1">{p.name}</span>
                <span className="text-xs text-success font-medium shrink-0">+ adicionar</span>
              </button>
            ))}
        </div>
      )}

      {/* Produtos na coleção */}
      <div className="mt-3">
        {loading ? <p className="text-xs text-muted-foreground">Carregando...</p>
          : naColecao.length === 0 ? <p className="text-xs text-muted-foreground">Nenhum produto. Use a busca acima.</p>
          : (
            <div className="flex flex-wrap gap-2">
              {naColecao.map(p => (
                <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full bg-card border border-border pl-1 pr-2 py-1 text-sm">
                  {imgDe(p) ? <img src={imgDe(p)!} className="h-6 w-6 rounded-full object-cover bg-secondary" /> : <span className="h-6 w-6 rounded-full bg-secondary" />}
                  <span className="text-foreground max-w-[160px] line-clamp-1">{p.name}</span>
                  <button onClick={() => remover(p.id)} className="text-muted-foreground hover:text-red-500 ml-0.5" title="Remover">✕</button>
                </span>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
