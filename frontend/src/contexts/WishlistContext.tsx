import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { api } from '@/services/api';
import { useAuth } from './AuthContext';

type WishlistContextType = {
  ids: number[];          // variant_ids favoritados
  toggle: (variantId: number) => Promise<void>;
  isWishlisted: (variantId: number) => boolean;
};

const WishlistContext = createContext<WishlistContextType | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<number[]>([]);

  // Carrega os IDs sempre que o usuário logar
  const fetchIds = useCallback(async () => {
    if (!user) { setIds([]); return; }
    try {
      const res = await api.get('/wishlist/ids');
      setIds(res.data.data.variant_ids);
    } catch {
      setIds([]);
    }
  }, [user?.id]);

  useEffect(() => { fetchIds(); }, [fetchIds]);

  async function toggle(variantId: number) {
    if (!user) return; // precisa estar logado

    if (ids.includes(variantId)) {
      await api.delete(`/wishlist/items/${variantId}`);
      setIds(prev => prev.filter(id => id !== variantId));
    } else {
      await api.post('/wishlist/items', { variant_id: variantId });
      setIds(prev => [...prev, variantId]);
    }
  }

  function isWishlisted(variantId: number) {
    return ids.includes(variantId);
  }

  return (
    <WishlistContext.Provider value={{ ids, toggle, isWishlisted }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist deve ser usado dentro de WishlistProvider');
  return ctx;
}
