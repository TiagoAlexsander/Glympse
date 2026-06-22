import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { api } from '@/services/api';
import { HeroCarousel, type HeroSlide } from '@/components/HeroCarousel';
import { ProductCard } from '@/components/ProductCard';
import { CategoryTrack } from '@/components/CategoryTrack';

type Product = {
  id: number; name: string; slug: string;
  base_price: number; compare_price: number | null;
  categories: { name: string } | null;
  product_images: { url: string; alt_text: string }[];
};
type Collection = { id: number; name: string; slug: string; image_url: string | null };
type Category = { id: number; name: string; slug: string };

// Slides do hero — imagens editoriais P&B do tema (em public/images)
const SLIDES_HERO: HeroSlide[] = [
  { title: 'Vista o essencial', subtitle: 'Nova coleção', image: '/images/hero-1.png', ctaLabel: 'Ver produtos', ctaHref: '/produtos' },
  { title: 'Minimalismo atemporal', subtitle: 'Glympse', image: '/images/hero-2.png', ctaLabel: 'Explorar', ctaHref: '/produtos' },
  { title: 'Forma e função', subtitle: 'Streetwear', image: '/images/hero-4.png', ctaLabel: 'Comprar agora', ctaHref: '/produtos' },
];

// Faixa de valores/benefícios
const VALORES = [
  { t: 'Frete grátis', d: 'Acima de R$ 299' },
  { t: 'Troca fácil', d: 'Até 30 dias' },
  { t: 'Pagamento seguro', d: 'PIX e cartão' },
  { t: 'Atendimento', d: 'Suporte dedicado' },
];

export function HomePage() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    Promise.all([
      api.get('/products?featured=true&limit=8').then(r => r.data.data.products).catch(() => []),
      api.get('/collections/public').then(r => r.data.data.collections).catch(() => []),
      api.get('/categories').then(r => r.data.data.categories).catch(() => []),
    ]).then(([prods, cols, cats]) => {
      setFeatured(prods);
      setCollections(cols);
      setCategories(cats);
    }).finally(() => setLoading(false));
  }, []);

  // Hero usa as imagens editoriais do tema (qualidade superior às fotos de produto)
  const slides = SLIDES_HERO;

  return (
    <div>
      {/* ── Hero ── */}
      <HeroCarousel slides={slides} />

      {/* ── Faixa de valores ── */}
      <div className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-2 sm:grid-cols-4 divide-x divide-border">
          {VALORES.map(v => (
            <div key={v.t} className="px-4 py-5 text-center">
              <p className="font-display text-xs font-bold uppercase tracking-widest">{v.t}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{v.d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Slider de categorias (arrastável) ── */}
      <CategoryTrack categories={categories} />

      {/* ── Produtos em destaque ── */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight">Destaques</h2>
          <Link href="/produtos" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground border-b border-current pb-0.5">
            Ver tudo
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[3/4] bg-secondary mb-3" />
                <div className="h-2 w-1/3 bg-secondary mb-2" /><div className="h-3 w-2/3 bg-secondary" />
              </div>
            ))}
          </div>
        ) : featured.length === 0 ? (
          <p className="text-sm uppercase tracking-widest text-muted-foreground">Nenhum produto em destaque ainda.</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map(p => (
              <ProductCard
                key={p.id}
                slug={p.slug}
                name={p.name}
                basePrice={p.base_price}
                comparePrice={p.compare_price}
                category={p.categories?.name}
                image={p.product_images[0]?.url}
                imageAlt={p.product_images[0]?.alt_text}
                isFeatured
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Coleções em destaque ── */}
      {collections.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-16">
          <div className="mb-8 flex items-end justify-between">
            <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight">Coleções</h2>
            <Link href="/colecoes" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground border-b border-current pb-0.5">
              Ver todas
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collections.slice(0, 3).map(c => (
              <Link key={c.id} href={`/colecoes/${c.id}`}>
                <div className="group relative h-64 overflow-hidden bg-secondary cursor-pointer">
                  {c.image_url && (
                    <img src={c.image_url} alt={c.name} className="h-full w-full object-cover group-hover:scale-105 transition duration-700" />
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-end p-6">
                    <div>
                      <p className="font-display text-xl font-bold uppercase tracking-wide text-white">{c.name}</p>
                      <span className="mt-2 inline-block text-[10px] font-bold uppercase tracking-widest text-white/80 border-b border-white/60 pb-0.5">Explorar →</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Newsletter (com textura de fundo) ── */}
      <section className="relative overflow-hidden py-24 text-white">
        <img src="/images/texture-1.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative mx-auto max-w-md px-4 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight">Entre para o círculo</h2>
          <p className="mt-3 text-sm text-white/70">Receba acesso antecipado a lançamentos, edições limitadas e ofertas exclusivas.</p>
          <form onSubmit={e => e.preventDefault()} className="mt-8 flex border-b border-white/40">
            <input
              type="email"
              placeholder="SEU EMAIL"
              className="flex-1 bg-transparent px-2 py-3 text-sm uppercase tracking-wider outline-none text-white placeholder:text-white/40"
            />
            <button className="px-4 text-[11px] font-bold uppercase tracking-widest hover:opacity-70 transition">
              Assinar
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
