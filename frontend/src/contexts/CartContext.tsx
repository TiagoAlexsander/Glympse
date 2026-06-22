import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { api } from '@/services/api';
import { useAuth } from './AuthContext';

export type CartItem = {
  id: number;
  quantity: number;
  unit_price: number;
  variant: {
    id: number;
    sku: string;
    price: number;
    color_name: string | null;
    attributes: Record<string, string>;
    stock_available: number;
  };
  product: {
    id: number;
    name: string;
    slug: string;
    image: { url: string; alt_text: string } | null;
  };
};

type Cart = {
  id: number;
  items: CartItem[];
  subtotal: number;
  total: number;
  quantity: number;
  coupon_id: number | null;
};

type CartContextType = {
  cart: Cart | null;
  loading: boolean;
  addItem: (variantId: number, quantity?: number) => Promise<void>;
  updateItem: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  loadCart: () => Promise<void>;
  sessionId: string;
};

const CartContext = createContext<CartContextType | null>(null);

// Gera ou recupera um session_id para o carrinho guest
function getOrCreateSessionId(): string {
  let id = localStorage.getItem('glympse_session_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('glympse_session_id', id);
  }
  return id;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const [cart, setCart]       = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const sessionId             = getOrCreateSessionId();

  // Headers corretos dependendo se está logado ou não
  function cartHeaders() {
    const headers: Record<string, string> = { 'x-session-id': sessionId };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  const fetchCart = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/cart', { headers: cartHeaders() });
      setCart(res.data.data.cart);
    } catch {
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, [token, sessionId]);

  // Quando faz login, faz o merge do carrinho guest e recarrega
  useEffect(() => {
    if (user && token) {
      api.post('/cart/merge', { session_id: sessionId }, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => setCart(res.data.data.cart)).catch(() => fetchCart());
    } else {
      fetchCart();
    }
  }, [user?.id]);

  async function addItem(variantId: number, quantity = 1) {
    const res = await api.post('/cart/items', { variant_id: variantId, quantity }, { headers: cartHeaders() });
    setCart(res.data.data.cart);
  }

  async function updateItem(itemId: number, quantity: number) {
    const res = await api.patch(`/cart/items/${itemId}`, { quantity }, { headers: cartHeaders() });
    setCart(res.data.data.cart);
  }

  async function removeItem(itemId: number) {
    const res = await api.delete(`/cart/items/${itemId}`, { headers: cartHeaders() });
    setCart(res.data.data.cart);
  }

  async function clearCart() {
    await api.delete('/cart', { headers: cartHeaders() });
    setCart(prev => prev ? { ...prev, items: [], subtotal: 0, total: 0, quantity: 0 } : null);
  }

  return (
    <CartContext.Provider value={{ cart, loading, addItem, updateItem, removeItem, clearCart, loadCart: fetchCart, sessionId }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart deve ser usado dentro de CartProvider');
  return ctx;
}
