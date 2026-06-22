import { useEffect, useState } from 'react';
import { useRoute, Link, useLocation } from 'wouter';
import { api } from '@/services/api';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useAuth } from '@/contexts/AuthContext';
import { ProductReviews } from '@/components/ProductReviews';
import { ProductCard } from '@/components/ProductCard';
import { formatarReal, ordemTamanho } from '@/utils';

type Variant = {
  id: number;
  sku: string;
  price: number;
  color_name: string | null;
  color_hex: string | null;
  stock_available: number;
  attributes: Record<string, string>;
};

type ProductImage = { id: number; url: string; alt_text: string; is_primary: boolean; sort_order: number };

type Product = {
  id: number;
  name: string;
  slug: string;
  brand: string | null;
  short_description: string | null;
  description: string | null;
  material: string | null;
  care_instructions: string | null;
  base_price: number;
  compare_price: number | null;
  product_images: ProductImage[];
  product_variants: Variant[];
  categories: { id: number; name: string; slug: string } | null;
  collections: { id: number; name: string; slug: string }[];
};

type RelatedProduct = {
  id: number;
  name: string;
  slug: string;
  base_price: number;
  compare_price: number | null;
  product_images: { url: string; alt_text: string }[];
};

export function ProductDetailPage() {
  const [, params]      = useRoute<{ slug: string }>('/products/:slug');
  const slug            = params?.slug ?? '';  // params pode ser null quando a rota não casa
  const { user }        = useAuth();
  const { addItem }     = useCart();
  const { toggle, isWishlisted } = useWishlist();
  const [, navigate]    = useLocation();

  const [product, setProduct]         = useState<Product | null>(null);
  const [loading, setLoading]         = useState(true);
  const [notFound, setNotFound]       = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [selectedImage, setSelectedImage]     = useState<ProductImage | null>(null);
  const [adding, setAdding]           = useState(false);
  const [added, setAdded]             = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [related, setRelated]         = useState<RelatedProduct[]>([]);
  const [showGuide, setShowGuide]     = useState(false);

  useEffect(() => {
    setLoading(true);
    window.scrollTo(0, 0); // volta ao topo ao trocar de produto
    api.get(`/products/${slug}`)
      .then(res => {
        const p = res.data.data.product as Product;
        setProduct(p);
        // Seleciona a imagem principal
        const primary = p.product_images.find(i => i.is_primary) ?? p.product_images[0] ?? null;
        setSelectedImage(primary);
        // Pré-seleciona primeira variante com estoque
        const comEstoque = p.product_variants.find(v => v.stock_available > 0);
        setSelectedVariant(comEstoque ?? null);
        // Busca produtos relacionados da mesma categoria
        if (p.categories?.id) {
          api.get(`/products?category=${p.categories.id}&limit=5`)
            .then(r => setRelated((r.data.data.products as RelatedProduct[]).filter(rp => rp.id !== p.id).slice(0, 4)))
            .catch(() => setRelated([]));
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  async function handleAddToCart() {
    if (!selectedVariant) return;
    // Redireciona para cadastro se não estiver logado
    if (!user) { navigate('/register'); return; }
    setAdding(true);
    try {
      await addItem(selectedVariant.id, 1);
      setAdded(true);
      setTimeout(() => setAdded(false), 2500);
    } catch (err: any) {
      alert(err?.response?.data?.error ?? 'Erro ao adicionar ao carrinho.');
    } finally {
      setAdding(false);
    }
  }

  async function handleWishlist() {
    if (!selectedVariant) return;
    // Redireciona para cadastro se não estiver logado
    if (!user) { navigate('/register'); return; }
    setWishlistLoading(true);
    try {
      await toggle(selectedVariant.id);
    } finally {
      setWishlistLoading(false);
    }
  }

  // Agrupa variantes por atributo (ex: Tamanho) e ordena por ordem canônica
  function getSizes(): { label: string; variant: Variant }[] {
    return (product?.product_variants ?? [])
      .map(v => ({ label: Object.values(v.attributes)[0] ?? v.sku, variant: v }))
      .sort((a, b) => ordemTamanho(a.label) - ordemTamanho(b.label));
  }

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground text-xs uppercase tracking-widest">Carregando...</div>
  );

  if (notFound || !product) return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <p className="text-muted-foreground text-sm uppercase tracking-widest">Produto não encontrado.</p>
      <Link href="/" className="text-xs font-bold uppercase tracking-widest border-b border-foreground pb-0.5">← Voltar para loja</Link>
    </div>
  );

  const sizes            = getSizes();
  const wishlisted       = selectedVariant ? isWishlisted(selectedVariant.id) : false;
  // Preço atual = o da variante selecionada (cada tamanho pode ter preço próprio)
  const precoAtual       = selectedVariant?.price ?? product.base_price;
  // Desconto calculado sobre o preço REAL exibido, não sobre o base_price
  const desconto         = product.compare_price && product.compare_price > precoAtual
    ? Math.round((1 - precoAtual / product.compare_price) * 100)
    : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">

      {/* Breadcrumb */}
      <nav className="mb-8 flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Loja</Link>
        <span>/</span>
        {product.categories && (
          <>
            <Link href={`/produtos?categoria=${product.categories.slug}`} className="hover:text-foreground">
              {product.categories.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">

        {/* Galeria */}
        <div className="flex gap-3">
          {/* Thumbnails */}
          {product.product_images.length > 1 && (
            <div className="flex flex-col gap-2">
              {product.product_images.map(img => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(img)}
                  className={`h-16 w-12 overflow-hidden border-2 transition ${
                    selectedImage?.id === img.id ? 'border-foreground' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img.url} alt={img.alt_text} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Imagem principal */}
          <div className="flex-1 aspect-[3/4] overflow-hidden bg-secondary">
            {selectedImage ? (
              <img
                src={selectedImage.url}
                alt={selectedImage.alt_text}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs uppercase tracking-widest">sem foto</div>
            )}
          </div>
        </div>

        {/* Info do produto */}
        <div className="flex flex-col gap-5">

          {product.brand && (
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{product.brand}</p>
          )}

          <h1 className="font-display text-xl font-bold uppercase tracking-tight leading-tight">{product.name}</h1>

          {/* Preço */}
          <div className="flex items-center gap-3">
            <span className="font-mono text-2xl font-bold">
              {formatarReal(precoAtual)}
            </span>
            {desconto && (
              <>
                <span className="font-mono text-base text-muted-foreground line-through">
                  {formatarReal(product.compare_price!)}
                </span>
                <span className="bg-destructive text-destructive-foreground px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                  -{desconto}%
                </span>
              </>
            )}
          </div>

          {product.short_description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{product.short_description}</p>
          )}

          {/* Coleções a que o produto pertence */}
          {product.collections?.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Faz parte de:</span>
              {product.collections.map(c => (
                <Link key={c.id} href={`/colecoes/${c.id}`}
                  className="border border-border px-2.5 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground hover:border-foreground hover:text-foreground transition">
                  {c.name}
                </Link>
              ))}
            </div>
          )}

          {/* Seleção de tamanho */}
          {sizes.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Tamanho
                  {selectedVariant && (
                    <span className="ml-2 text-foreground">— {Object.values(selectedVariant.attributes)[0]}</span>
                  )}
                </p>
                {/* Guia de tamanhos só para roupas (tamanhos por letra) */}
                {sizes.some(s => ['PP','P','M','G','GG','XG'].includes(s.label.toUpperCase())) && (
                  <button onClick={() => setShowGuide(true)}
                    className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground border-b border-current pb-0.5">
                    Guia de tamanhos
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {sizes.map(({ label, variant }) => {
                  const semEstoque = variant.stock_available === 0;
                  const selecionado = selectedVariant?.id === variant.id;

                  return (
                    <button
                      key={variant.id}
                      onClick={() => !semEstoque && setSelectedVariant(variant)}
                      disabled={semEstoque}
                      title={semEstoque ? 'Sem estoque' : `${variant.stock_available} disponíveis`}
                      className={`relative h-10 min-w-[44px] border px-3 text-sm font-medium uppercase transition
                        ${selecionado
                          ? 'border-foreground bg-foreground text-background'
                          : semEstoque
                            ? 'cursor-not-allowed border-border text-muted-foreground opacity-40'
                            : 'border-border text-foreground hover:border-foreground'
                        }`}
                    >
                      {label}
                      {semEstoque && (
                        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="absolute w-[110%] h-px bg-muted-foreground rotate-45 opacity-60" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {selectedVariant && selectedVariant.stock_available <= 3 && selectedVariant.stock_available > 0 && (
                <p className="mt-2 text-xs uppercase tracking-wider text-destructive">
                  Restam apenas {selectedVariant.stock_available} unidades
                </p>
              )}
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 mt-2">
            <button
              onClick={handleAddToCart}
              disabled={adding || !selectedVariant}
              className={`flex-1 py-3.5 text-[11px] font-bold uppercase tracking-widest transition ${
                added
                  ? 'bg-success text-success-foreground'
                  : 'bg-primary text-primary-foreground hover:opacity-80 disabled:opacity-40'
              }`}
            >
              {adding ? 'Adicionando...' : added ? '✓ Adicionado' : !selectedVariant ? 'Selecione um tamanho' : 'Adicionar ao carrinho'}
            </button>

            {/* Botão wishlist — sempre visível; sem login redireciona para cadastro */}
            <button
              onClick={handleWishlist}
              disabled={wishlistLoading || !selectedVariant}
              title={wishlisted ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              className={`flex items-center justify-center border px-4 transition ${
                wishlisted
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border text-foreground hover:border-foreground'
              } disabled:opacity-40`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill={wishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.49 4.04 3 5.5l7 7Z"/></svg>
            </button>
          </div>

          {/* Detalhes */}
          {(product.material || product.care_instructions) && (
            <div className="border-t border-border pt-4 space-y-2">
              {product.material && (
                <p className="text-xs text-muted-foreground"><strong className="text-foreground uppercase tracking-wider">Material:</strong> {product.material}</p>
              )}
              {product.care_instructions && (
                <p className="text-xs text-muted-foreground"><strong className="text-foreground uppercase tracking-wider">Cuidados:</strong> {product.care_instructions}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Descrição completa */}
      {product.description && (
        <div className="mt-12 border-t border-border pt-8">
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-widest">Descrição</h2>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{product.description}</p>
        </div>
      )}

      {/* Avaliações */}
      <div className="border-t border-border pt-2">
        <ProductReviews productId={product.id} />
      </div>

      {/* Produtos relacionados */}
      {related.length > 0 && (
        <div className="mt-12 border-t border-border pt-8">
          <h2 className="mb-6 font-display text-sm font-bold uppercase tracking-widest">Você também pode gostar</h2>
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-4">
            {related.map(rp => (
              <ProductCard
                key={rp.id}
                slug={rp.slug}
                name={rp.name}
                basePrice={rp.base_price}
                comparePrice={rp.compare_price}
                image={rp.product_images[0]?.url}
                imageAlt={rp.name}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Modal: guia de tamanhos ── */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={() => setShowGuide(false)}>
          <div className="w-full max-w-lg border border-border bg-background p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-1">
              <h2 className="font-display text-sm font-bold uppercase tracking-widest">Guia de tamanhos</h2>
              <button onClick={() => setShowGuide(false)} className="text-muted-foreground hover:text-foreground text-xl leading-none">✕</button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Medidas em centímetros. Na dúvida entre dois tamanhos, escolha o maior.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    <th className="py-2 text-left font-bold">Tamanho</th>
                    <th className="py-2 text-center font-bold">Busto</th>
                    <th className="py-2 text-center font-bold">Cintura</th>
                    <th className="py-2 text-center font-bold">Quadril</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    ['PP', '78–82', '60–64', '86–90'],
                    ['P',  '83–87', '65–69', '91–95'],
                    ['M',  '88–93', '70–75', '96–101'],
                    ['G',  '94–99', '76–81', '102–107'],
                    ['GG', '100–106', '82–88', '108–114'],
                    ['XG', '107–113', '89–95', '115–121'],
                  ].map(([t, b, c, q]) => (
                    <tr key={t}>
                      <td className="py-2.5 font-bold">{t}</td>
                      <td className="py-2.5 text-center text-muted-foreground">{b}</td>
                      <td className="py-2.5 text-center text-muted-foreground">{c}</td>
                      <td className="py-2.5 text-center text-muted-foreground">{q}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
