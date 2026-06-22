import { useEffect, useState } from 'react';
import { Link, useRoute } from 'wouter';
import { api } from '@/services/api';
import { ProductCard } from '@/components/ProductCard';

type Collection = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
};
type Product = {
  id: number;
  name: string;
  slug: string;
  base_price: number;
  compare_price: number | null;
  product_images: { url: string; alt_text: string }[];
};

// Lista de todas as coleções visíveis
export function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/collections/public')
      .then(r => setCollections(r.data.data.collections))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="py-20 text-center text-xs uppercase tracking-widest text-muted-foreground">Carregando...</p>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-8 font-display text-2xl font-bold uppercase tracking-tight border-b border-border pb-6">Coleções</h1>
      {collections.length === 0 ? (
        <p className="text-sm uppercase tracking-widest text-muted-foreground">Nenhuma coleção disponível no momento.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map(c => (
            <Link key={c.id} href={`/colecoes/${c.id}`}>
              <div className="group relative h-52 overflow-hidden bg-secondary cursor-pointer">
                {c.image_url && (
                  <img src={c.image_url} alt={c.name} className="h-full w-full object-cover group-hover:scale-105 transition duration-700" />
                )}
                <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-5">
                  <p className="font-display text-lg font-bold uppercase tracking-wide text-white">{c.name}</p>
                  {c.description && <p className="text-[10px] uppercase tracking-widest text-white/70 line-clamp-1 mt-1">{c.description}</p>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// Produtos de uma coleção específica
export function CollectionDetailPage() {
  const [, params] = useRoute<{ id: string }>('/colecoes/:id');
  const id = params?.id;

  const [collection, setCollection] = useState<Collection | null>(null);
  const [products, setProducts]     = useState<Product[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    if (!id) return;
    api.get(`/collections/${id}/products`)
      .then(r => { setCollection(r.data.data.collection); setProducts(r.data.data.products); })
      .catch(() => setCollection(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="py-20 text-center text-xs uppercase tracking-widest text-muted-foreground">Carregando...</p>;
  if (!collection) return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
      <p className="text-sm uppercase tracking-widest text-muted-foreground">Coleção não encontrada.</p>
      <Link href="/colecoes" className="text-xs font-bold uppercase tracking-widest border-b border-foreground pb-0.5">← Todas as coleções</Link>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Link href="/colecoes" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">← Todas as coleções</Link>
      <h1 className="mt-2 mb-8 font-display text-2xl font-bold uppercase tracking-tight border-b border-border pb-6">{collection.name}</h1>

      {products.length === 0 ? (
        <p className="text-sm uppercase tracking-widest text-muted-foreground">Nenhum produto nesta coleção ainda.</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {products.map(p => (
            <ProductCard
              key={p.id}
              slug={p.slug}
              name={p.name}
              basePrice={p.base_price}
              comparePrice={p.compare_price}
              image={p.product_images[0]?.url}
              imageAlt={p.product_images[0]?.alt_text}
            />
          ))}
        </div>
      )}
    </div>
  );
}
