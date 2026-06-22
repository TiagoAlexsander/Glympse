import { useEffect, useState, useRef } from 'react';
import { useSearch } from 'wouter';
import { api } from '@/services/api';
import { ProductCard } from '@/components/ProductCard';

type Product = {
  id: number;
  name: string;
  slug: string;
  short_description: string;
  brand: string;
  base_price: number;
  compare_price: number | null;
  is_featured: boolean;
  low_stock?: boolean;
  out_of_stock?: boolean;
  categories: { name: string; slug: string } | null;
  product_images: { url: string; alt_text: string }[];
};

type Category = { id: number; name: string; slug: string };

// Chaves de sessionStorage para persistir filtros
const SK = {
  search:   'glympse_filter_search',
  category: 'glympse_filter_category',
  sort:     'glympse_filter_sort',
  minPrice: 'glympse_filter_minPrice',
  maxPrice: 'glympse_filter_maxPrice',
};

export function ProductsPage() {
  const searchString = useSearch(); // querystring reativa (ex: "q=camiseta")

  const [products,   setProducts]   = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading,    setLoading]    = useState(true);

  // Filtros — lidos do sessionStorage para persistência ao voltar de um produto
  const [search,    setSearch]    = useState(() => sessionStorage.getItem(SK.search)    ?? '');
  const [category,  setCategory]  = useState(() => sessionStorage.getItem(SK.category)  ?? '');
  const [sort,      setSort]      = useState(() => sessionStorage.getItem(SK.sort)      ?? '');
  const [minPrice,  setMinPrice]  = useState(() => sessionStorage.getItem(SK.minPrice)  ?? '');
  const [maxPrice,  setMaxPrice]  = useState(() => sessionStorage.getItem(SK.maxPrice)  ?? '');

  // Persiste cada filtro quando muda
  useEffect(() => { sessionStorage.setItem(SK.search,   search);   }, [search]);
  useEffect(() => { sessionStorage.setItem(SK.category, category); }, [category]);
  useEffect(() => { sessionStorage.setItem(SK.sort,     sort);     }, [sort]);
  useEffect(() => { sessionStorage.setItem(SK.minPrice, minPrice); }, [minPrice]);
  useEffect(() => { sessionStorage.setItem(SK.maxPrice, maxPrice); }, [maxPrice]);

  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data.data.categories));
  }, []);

  // Aplica os parâmetros da URL (?q=busca, ?categoria=slug) sempre que mudam
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const q = params.get('q');
    if (q !== null) setSearch(q);

    const slugParam = params.get('categoria');
    if (slugParam && categories.length > 0) {
      const encontrada = categories.find(c => c.slug === slugParam);
      if (encontrada) setCategory(String(encontrada.id));
    }
  }, [searchString, categories]);

  // Refs para debounce do preço (evita chamada a cada tecla)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedMin, setDebouncedMin] = useState(minPrice);
  const [debouncedMax, setDebouncedMax] = useState(maxPrice);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedMin(minPrice);
      setDebouncedMax(maxPrice);
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [minPrice, maxPrice]);

  // Busca com AbortController — cancela a requisição anterior se uma nova disparar
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    const params = new URLSearchParams();
    if (search)        params.set('search',    search);
    if (category)      params.set('category',  category);
    if (sort)          params.set('sort',       sort);
    const numMin = parseFloat(debouncedMin);
    const numMax = parseFloat(debouncedMax);
    if (debouncedMin && !isNaN(numMin)) params.set('min_price', String(numMin));
    if (debouncedMax && !isNaN(numMax)) params.set('max_price', String(numMax));
    params.set('limit', '50');

    api.get(`/products?${params.toString()}`, { signal: controller.signal })
      .then(r => setProducts(r.data.data.products))
      .catch(() => {})
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [search, category, sort, debouncedMin, debouncedMax]);

  function limparFiltros() {
    setSearch(''); setCategory(''); setSort('');
    setMinPrice(''); setMaxPrice('');
    Object.values(SK).forEach(k => sessionStorage.removeItem(k));
  }

  const temFiltro = search || category || sort || minPrice || maxPrice;

  const inputCls = "border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground transition placeholder:text-muted-foreground";

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">

      {/* Cabeçalho da loja */}
      <div className="mb-8 flex items-end justify-between border-b border-border pb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight">Loja</h1>
          <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
            {loading ? 'Carregando...' : `${products.length} ${products.length === 1 ? 'produto' : 'produtos'}`}
          </p>
        </div>
        {temFiltro && (
          <button
            onClick={limparFiltros}
            className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground border-b border-current pb-0.5 transition"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* ── Filtros ─────────────────────────────────────────────────── */}
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="BUSCAR..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={`${inputCls} w-48 uppercase tracking-wider text-xs`}
        />
        <select value={category} onChange={e => setCategory(e.target.value)} className={`${inputCls} uppercase tracking-wider text-xs`}>
          <option value="">TODAS AS CATEGORIAS</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} className={`${inputCls} uppercase tracking-wider text-xs`}>
          <option value="">MAIS RECENTES</option>
          <option value="price_asc">MENOR PREÇO</option>
          <option value="price_desc">MAIOR PREÇO</option>
        </select>

        {/* Range de preço */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
            <input
              type="text" inputMode="decimal" placeholder="mín" value={minPrice}
              onChange={e => { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) setMinPrice(v); }}
              className={`${inputCls} w-24 pl-7`}
            />
          </div>
          <span className="text-muted-foreground">—</span>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
            <input
              type="text" inputMode="decimal" placeholder="máx" value={maxPrice}
              onChange={e => { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) setMaxPrice(v); }}
              className={`${inputCls} w-24 pl-7`}
            />
          </div>
        </div>
      </div>

      {/* ── Grid de produtos ─────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[3/4] bg-secondary mb-3" />
              <div className="h-2 w-1/3 bg-secondary mb-2" />
              <div className="h-3 w-2/3 bg-secondary" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">Nenhum produto encontrado.</p>
          {temFiltro && (
            <button onClick={limparFiltros} className="text-xs font-bold uppercase tracking-widest border-b border-foreground pb-0.5">
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {products.map(p => (
            <ProductCard
              key={p.id}
              slug={p.slug}
              name={p.name}
              basePrice={p.base_price}
              comparePrice={p.compare_price}
              category={p.categories?.name}
              image={p.product_images[0]?.url}
              imageAlt={p.product_images[0]?.alt_text}
              isFeatured={p.is_featured}
              lowStock={p.low_stock}
              outOfStock={p.out_of_stock}
            />
          ))}
        </div>
      )}
    </div>
  );
}
