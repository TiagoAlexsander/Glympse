import { useLocation } from 'wouter';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatarReal } from '@/utils';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function CartDrawer({ open, onClose }: Props) {
  const { cart, loading, updateItem, removeItem, clearCart } = useCart();
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Fecha o drawer e vai para o checkout (ou cadastro se não estiver logado)
  function irParaCheckout() {
    onClose();
    navigate(user ? '/checkout' : '/register');
  }

  if (!open) return null;

  const items    = cart?.items ?? [];
  const subtotal = cart?.subtotal ?? 0;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-background border-l border-border shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 h-16">
          <h2 className="font-display text-sm font-bold uppercase tracking-widest">
            Carrinho {cart?.quantity ? `(${cart.quantity})` : ''}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">✕</button>
        </div>

        {/* Itens */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loading && <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">Carregando...</p>}

          {!loading && items.length === 0 && (
            <p className="text-center text-xs uppercase tracking-widest text-muted-foreground mt-10">Seu carrinho está vazio.</p>
          )}

          {items.map(item => (
            <div key={item.id} className="flex gap-3">
              {item.product.image ? (
                <img src={item.product.image.url} alt={item.product.image.alt_text}
                  className="h-24 w-[72px] object-cover bg-secondary shrink-0" />
              ) : (
                <div className="h-24 w-[72px] bg-secondary shrink-0" />
              )}

              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <p className="font-display text-[11px] font-bold uppercase tracking-wide leading-tight">{item.product.name}</p>
                  {Object.entries(item.variant.attributes).map(([k, v]) => (
                    <p key={k} className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">{k}: {v}</p>
                  ))}
                  <p className="mt-1 font-mono text-sm font-bold">{formatarReal(item.unit_price)}</p>
                </div>

                {/* Controles de quantidade */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-border">
                    <button
                      onClick={() => item.quantity > 1 ? updateItem(item.id, item.quantity - 1) : removeItem(item.id)}
                      className="h-7 w-7 text-sm hover:bg-secondary"
                    >−</button>
                    <span className="text-sm w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateItem(item.id, item.quantity + 1)}
                      disabled={item.quantity >= item.variant.stock_available}
                      className="h-7 w-7 text-sm hover:bg-secondary disabled:opacity-30"
                    >+</button>
                  </div>
                  <button onClick={() => removeItem(item.id)} className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground hover:text-destructive">
                    Remover
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer com total */}
        {items.length > 0 && (
          <div className="border-t border-border px-5 py-4 space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Subtotal</span>
              <span className="font-mono text-base font-bold">{formatarReal(subtotal)}</span>
            </div>
            <button
              onClick={irParaCheckout}
              className="w-full bg-primary py-3.5 text-[11px] font-bold uppercase tracking-widest text-primary-foreground hover:opacity-80 transition"
            >
              Finalizar compra
            </button>
            <button onClick={clearCart} className="w-full text-[10px] uppercase tracking-widest text-muted-foreground hover:text-destructive transition">
              Esvaziar carrinho
            </button>
          </div>
        )}
      </div>
    </>
  );
}
