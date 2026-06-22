import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { api } from '@/services/api';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatarReal } from '@/utils';

type WishlistItem = {
  id: number;
  added_at: string;
  variant: { id: number; sku: string; price: number };
  product: {
    id: number;
    name: string;
    slug: string;
    brand: string | null;
    base_price: number;
    compare_price: number | null;
    image: { url: string; alt_text: string } | null;
  };
};

// Modal de confirmação inline
function ConfirmModal({
  product,
  onConfirm,
  onCancel,
}: {
  product: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm border border-border bg-background p-6 shadow-2xl">
        <p className="font-display text-sm font-bold uppercase tracking-widest">Adicionar ao carrinho?</p>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          <span className="text-foreground">{product}</span> será adicionado ao carrinho e removido dos favoritos.
        </p>
        <div className="mt-5 flex gap-3">
          <button onClick={onConfirm}
            className="flex-1 bg-primary py-3 text-[11px] font-bold uppercase tracking-widest text-primary-foreground hover:opacity-80 transition">
            Confirmar
          </button>
          <button onClick={onCancel}
            className="flex-1 border border-border py-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export function WishlistPage() {
  const { user } = useAuth();
  const { toggle } = useWishlist();
  const { addItem } = useCart();

  const [items,     setItems]     = useState<WishlistItem[]>([]);
  const [loading,   setLoading]   = useState(true);
  // IDs sendo removidos (para animação de fade-out)
  const [removendo, setRemovendo] = useState<Set<number>>(new Set());
  // Item aguardando confirmação para ir ao carrinho
  const [confirmando, setConfirmando] = useState<WishlistItem | null>(null);
  const [adicionando, setAdicionando] = useState(false);

  async function fetchWishlist() {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.get('/wishlist');
      setItems(res.data.data.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchWishlist(); }, [user?.id]);

  // Remove imediatamente da UI (otimista) e chama API
  async function handleRemove(variantId: number) {
    setRemovendo(prev => new Set(prev).add(variantId));
    // Aguarda a animação de fade-out (300ms) antes de remover do DOM
    setTimeout(() => {
      setItems(prev => prev.filter(i => i.variant.id !== variantId));
      setRemovendo(prev => { const s = new Set(prev); s.delete(variantId); return s; });
    }, 300);
    await toggle(variantId);
  }

  // Confirmado: adiciona no carrinho e remove dos favoritos
  async function handleConfirmAddToCart() {
    if (!confirmando) return;
    setAdicionando(true);
    try {
      await addItem(confirmando.variant.id, 1);
      await handleRemove(confirmando.variant.id);
    } catch (err: any) {
      alert(err?.response?.data?.error ?? 'Erro ao adicionar ao carrinho.');
    } finally {
      setAdicionando(false);
      setConfirmando(null);
    }
  }

  // Não logado
  if (!user) return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <p className="text-sm uppercase tracking-widest text-muted-foreground">Entre para ver seus favoritos.</p>
      <Link href="/login" className="bg-primary px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-primary-foreground hover:opacity-80 transition">
        Entrar
      </Link>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">

      {/* Modal de confirmação */}
      {confirmando && (
        <ConfirmModal
          product={confirmando.product.name}
          onConfirm={handleConfirmAddToCart}
          onCancel={() => setConfirmando(null)}
        />
      )}

      <h1 className="mb-8 font-display text-2xl font-bold uppercase tracking-tight border-b border-border pb-6">
        Favoritos {items.length > 0 ? <span className="text-muted-foreground">({items.length})</span> : ''}
      </h1>

      {loading && <p className="text-center text-xs uppercase tracking-widest text-muted-foreground py-20">Carregando...</p>}

      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">Você ainda não tem favoritos.</p>
          <Link href="/" className="bg-primary px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-primary-foreground hover:opacity-80 transition">
            Explorar produtos
          </Link>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {items.map(item => (
            <div
              key={item.id}
              className={`group flex h-full flex-col transition-all duration-300 ${
                removendo.has(item.variant.id) ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
              }`}
            >
              <Link href={`/products/${item.product.slug}`}>
                <div className="aspect-[3/4] bg-secondary overflow-hidden cursor-pointer mb-3 border border-border group-hover:border-foreground transition-colors">
                  {item.product.image ? (
                    <img src={item.product.image.url} alt={item.product.image.alt_text}
                      className="h-full w-full object-cover group-hover:scale-105 transition duration-700" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs uppercase tracking-widest">sem foto</div>
                  )}
                </div>
              </Link>

              <div className="flex flex-1 flex-col">
                {item.product.brand && (
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{item.product.brand}</p>
                )}
                <Link href={`/products/${item.product.slug}`}>
                  <h3 className="font-display text-xs font-bold uppercase tracking-wide leading-tight line-clamp-2 hover:underline mt-0.5">
                    {item.product.name}
                  </h3>
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-sm">{formatarReal(item.product.base_price)}</span>
                  {item.product.compare_price && (
                    <span className="font-mono text-xs text-muted-foreground line-through">{formatarReal(item.product.compare_price)}</span>
                  )}
                </div>

                {/* Botões sempre no rodapé do card (alinhados entre cards) */}
                <div className="mt-auto pt-3">
                  <button
                    onClick={() => setConfirmando(item)}
                    disabled={adicionando && confirmando?.variant.id === item.variant.id}
                    className="w-full bg-primary py-2.5 text-[10px] font-bold uppercase tracking-widest text-primary-foreground hover:opacity-80 disabled:opacity-50 transition"
                  >
                    Adicionar ao carrinho
                  </button>
                  <button
                    onClick={() => handleRemove(item.variant.id)}
                    className="w-full py-2 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-destructive transition"
                  >
                    Remover dos favoritos
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
