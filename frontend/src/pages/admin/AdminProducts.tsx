import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { api } from '@/services/api';
import { formatarReal, TAMANHOS_SUGERIDOS, ordemTamanho } from '@/utils';

type AdminProduct = {
  id: number;
  name: string;
  slug: string;
  base_price: number;
  compare_price: number | null;
  is_active: boolean;
  is_featured: boolean;
  category_name: string | null;
  image: string | null;
  variant_count: number;
};

type Category = { id: number; name: string };

export function AdminProducts() {
  const [, navigate] = useLocation();

  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]   = useState(true);
  const [busca, setBusca]       = useState('');
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Formulário de novo produto
  const [showNew, setShowNew]   = useState(false);
  const [criando, setCriando]   = useState(false);
  const [novo, setNovo] = useState({
    name: '', base_price: '', compare_price: '', category_id: '', brand: '', image_url: '',
  });
  // Tamanhos selecionados (set). Começa com PP–GG marcados. Estoque é definido na aba Estoque.
  const [tamanhos, setTamanhos] = useState<Set<string>>(new Set(['PP', 'P', 'M', 'G', 'GG']));

  function toggleTamanho(size: string) {
    setTamanhos(prev => {
      const novo = new Set(prev);
      if (novo.has(size)) novo.delete(size);
      else novo.add(size);
      return novo;
    });
  }

  function carregar() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '30' });
    if (busca) params.set('search', busca);
    api.get(`/products/admin/list?${params.toString()}`)
      .then(r => { setProducts(r.data.data.products); setTotalPages(r.data.pagination.pages); })
      .finally(() => setLoading(false));
  }

  useEffect(() => { carregar(); }, [busca, page]);
  useEffect(() => { api.get('/categories').then(r => setCategories(r.data.data.categories)); }, []);

  async function criarProduto() {
    if (!novo.name || !novo.base_price) {
      alert('Preencha pelo menos o nome e o preço de venda.');
      return;
    }
    const variants = [...tamanhos]
      .sort((a, b) => ordemTamanho(a) - ordemTamanho(b))
      .map(size => ({ size, price: novo.base_price, stock: '0' }));
    if (variants.length === 0) {
      alert('Selecione pelo menos um tamanho.');
      return;
    }
    setCriando(true);
    try {
      const r = await api.post('/products/admin/full', {
        name:          novo.name,
        base_price:    parseFloat(novo.base_price.replace(',', '.')),
        compare_price: novo.compare_price.trim() ? parseFloat(novo.compare_price.replace(',', '.')) : undefined,
        category_id:   novo.category_id || undefined,
        brand:         novo.brand || undefined,
        image_url:     novo.image_url || undefined,
        variants,
      });
      // Vai direto para a edição do produto recém-criado
      navigate(`/admin/products/${r.data.data.product_id}`);
    } catch (e: any) {
      alert(e?.response?.data?.error ?? 'Erro ao criar produto.');
    } finally {
      setCriando(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">Cadastre produtos e edite preços, descontos, categoria e coleções. O estoque é gerido na aba Estoque.</p>
        <button
          onClick={() => setShowNew(v => !v)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-80 shrink-0"
        >
          {showNew ? 'Cancelar' : '+ Novo produto'}
        </button>
      </div>

      {/* ── Formulário de novo produto ── */}
      {showNew && (
        <div className="mb-6 border border-border bg-card p-5 space-y-4">
          <p className="text-sm font-semibold text-foreground">Novo produto</p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Nome *</label>
              <input value={novo.name} onChange={e => setNovo(p => ({ ...p, name: e.target.value }))}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm outline-none focus:border-foreground" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Preço de venda (R$) *</label>
              <input value={novo.base_price} inputMode="decimal"
                onChange={e => setNovo(p => ({ ...p, base_price: e.target.value.replace(/[^\d.,]/g, '') }))}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm outline-none focus:border-foreground" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Preço "de" (opcional, p/ desconto)</label>
              <input value={novo.compare_price} inputMode="decimal"
                onChange={e => setNovo(p => ({ ...p, compare_price: e.target.value.replace(/[^\d.,]/g, '') }))}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm outline-none focus:border-foreground" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Categoria</label>
              <select value={novo.category_id} onChange={e => setNovo(p => ({ ...p, category_id: e.target.value }))}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm outline-none focus:border-foreground">
                <option value="">Sem categoria</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Marca</label>
              <input value={novo.brand} onChange={e => setNovo(p => ({ ...p, brand: e.target.value }))}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm outline-none focus:border-foreground" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">URL da imagem</label>
              <input value={novo.image_url} onChange={e => setNovo(p => ({ ...p, image_url: e.target.value }))}
                placeholder="https://..."
                className="w-full rounded-lg border border-input px-3 py-2 text-sm outline-none focus:border-foreground" />
            </div>
          </div>

          {/* Tamanhos — escolha por botões (ordem fixa) */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Tamanhos do produto</label>
            <div className="flex flex-wrap gap-2">
              {TAMANHOS_SUGERIDOS.map(size => {
                const ativo = tamanhos.has(size);
                return (
                  <button key={size} type="button" onClick={() => toggleTamanho(size)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                      ativo ? 'border-foreground bg-primary text-primary-foreground' : 'border-input text-muted-foreground hover:border-foreground'
                    }`}>
                    {size}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              O produto será criado com estoque <strong>0</strong>. Defina as quantidades depois na aba <strong>Estoque</strong>.
            </p>
          </div>

          <button onClick={criarProduto} disabled={criando}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-80 disabled:opacity-50">
            {criando ? 'Criando...' : 'Criar produto'}
          </button>
        </div>
      )}

      <input
        type="text"
        placeholder="Buscar produto..."
        value={busca}
        onChange={e => { setBusca(e.target.value); setPage(1); }}
        className="mb-5 rounded-lg border border-input px-3 py-2 text-sm outline-none focus:border-foreground w-64"
      />

      {loading ? (
        <p className="text-center text-muted-foreground py-20">Carregando...</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {products.map(p => (
            <Link key={p.id} href={`/admin/products/${p.id}`}>
              <div className="flex gap-3 border border-border bg-card p-3 hover:shadow-md transition cursor-pointer">
                {p.image
                  ? <img src={p.image} className="h-16 w-14 rounded-lg object-cover bg-secondary shrink-0" />
                  : <div className="h-16 w-14 rounded-lg bg-secondary shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground line-clamp-1">{p.name}</p>
                    {!p.is_active && <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 rounded">inativo</span>}
                    {p.is_featured && <span className="text-[10px] bg-foreground text-background px-1.5 rounded">destaque</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{p.category_name ?? 'Sem categoria'} · {p.variant_count} tamanho(s)</p>
                  <p className="text-sm font-semibold text-foreground mt-1">{formatarReal(p.base_price)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-3">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-secondary">← Anterior</button>
          <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-secondary">Próxima →</button>
        </div>
      )}
    </div>
  );
}
