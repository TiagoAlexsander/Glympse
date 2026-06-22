import { Link, useLocation } from 'wouter';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatarReal } from '@/utils';

export function CartPage() {
  const [, navigate] = useLocation();
  const { user }     = useAuth();
  const { cart, loading, updateItem, removeItem, clearCart } = useCart();
  const items = cart?.items ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">

      <div className="mb-8 flex items-center justify-between border-b border-border pb-6">
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight">
          Carrinho {cart?.quantity ? <span className="text-muted-foreground">({cart.quantity})</span> : ''}
        </h1>
        {items.length > 0 && (
          <button onClick={clearCart} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-destructive transition">
            Esvaziar
          </button>
        )}
      </div>

      {loading && <p className="text-center text-muted-foreground text-xs uppercase tracking-widest py-20">Carregando...</p>}

      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">Seu carrinho está vazio.</p>
          <Link href="/" className="bg-primary px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-primary-foreground hover:opacity-80 transition">
            Continuar comprando
          </Link>
        </div>
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

          {/* Lista de itens */}
          <div className="lg:col-span-2 space-y-4">
            {items.map(item => (
              <div key={item.id} className="flex gap-4 border border-border bg-card p-4">
                <Link href={`/products/${item.product.slug}`}>
                  {item.product.image ? (
                    <img src={item.product.image.url} alt={item.product.image.alt_text}
                      className="h-28 w-[88px] object-cover bg-secondary shrink-0 hover:opacity-80 transition" />
                  ) : (
                    <div className="h-28 w-[88px] bg-secondary shrink-0" />
                  )}
                </Link>

                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <Link href={`/products/${item.product.slug}`}>
                      <p className="font-display text-xs font-bold uppercase tracking-wide hover:underline">{item.product.name}</p>
                    </Link>
                    {Object.entries(item.variant.attributes).map(([k, v]) => (
                      <p key={k} className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{k}: {v}</p>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    {/* Quantidade */}
                    <div className="flex items-center border border-border">
                      <button
                        onClick={() => item.quantity > 1 ? updateItem(item.id, item.quantity - 1) : removeItem(item.id)}
                        className="h-8 w-8 text-sm hover:bg-secondary transition"
                      >−</button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <button
                        onClick={() => updateItem(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.variant.stock_available}
                        className="h-8 w-8 text-sm hover:bg-secondary transition disabled:opacity-30"
                      >+</button>
                    </div>

                    <div className="flex items-center gap-4">
                      <p className="font-mono text-sm font-bold">{formatarReal(item.unit_price * item.quantity)}</p>
                      <button onClick={() => removeItem(item.id)} className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-destructive transition">
                        Remover
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <Link href="/" className="inline-block text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground mt-2">
              ← Continuar comprando
            </Link>
          </div>

          {/* Resumo do pedido */}
          <div className="lg:col-span-1">
            <div className="border border-border bg-card p-5 sticky top-24">
              <h2 className="mb-5 font-display text-sm font-bold uppercase tracking-widest">Resumo</h2>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span className="text-xs uppercase tracking-wider">Subtotal ({cart?.quantity})</span>
                  <span className="font-mono">{formatarReal(cart?.subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span className="uppercase tracking-wider">Frete</span>
                  <span>Calculado no checkout</span>
                </div>
              </div>

              <div className="my-4 border-t border-border" />

              <div className="flex justify-between items-baseline">
                <span className="text-xs font-bold uppercase tracking-widest">Total</span>
                <span className="font-mono text-lg font-bold">{formatarReal(cart?.total)}</span>
              </div>

              <button
                onClick={() => navigate('/checkout')}
                className="mt-5 w-full bg-primary py-3.5 text-[11px] font-bold uppercase tracking-widest text-primary-foreground hover:opacity-80 transition"
              >
                Finalizar compra
              </button>
              {!user && (
                <p className="mt-2 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
                  Você precisará entrar para finalizar.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
