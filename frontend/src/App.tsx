import { useState, useEffect } from 'react';
import { Switch, Route, Redirect, Link, useLocation } from 'wouter';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { CartProvider, useCart } from '@/contexts/CartContext';
import { WishlistProvider } from '@/contexts/WishlistContext';
import { CartDrawer } from '@/components/CartDrawer';
import { NotificationBell } from '@/components/NotificationBell';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Footer } from '@/components/Footer';
import { SearchBar } from '@/components/SearchBar';
import { HomePage } from '@/pages/Home';
import { LoginPage } from '@/pages/Login';
import { RegisterPage } from '@/pages/Register';
import { ProductsPage } from '@/pages/Products';
import { ProductDetailPage } from '@/pages/ProductDetail';
import { ShippingPage } from '@/pages/Shipping';
import { ContactPage } from '@/pages/Contact';
import { CartPage } from '@/pages/Cart';
import { WishlistPage } from '@/pages/Wishlist';
import { CheckoutPage } from '@/pages/Checkout';
import { OrdersPage } from '@/pages/Orders';
import { OrderDetailPage } from '@/pages/OrderDetail';
import { PaymentPage } from '@/pages/Payment';
import { ReturnsPage } from '@/pages/Returns';
import { ProfilePage } from '@/pages/Profile';
import { CollectionsPage, CollectionDetailPage } from '@/pages/Collections';
// Painel administrativo
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminOrders } from '@/pages/admin/AdminOrders';
import { AdminOrderDetail } from '@/pages/admin/AdminOrderDetail';
import { AdminCatalog } from '@/pages/admin/AdminCatalog';
import { AdminProductDetail } from '@/pages/admin/AdminProductDetail';
import { AdminReturns } from '@/pages/admin/AdminReturns';
import { AdminReviews } from '@/pages/admin/AdminReviews';
import { AdminUsersPage } from '@/pages/AdminUsers';
import { AdminInventoryPage } from '@/pages/AdminInventory';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Redirect to="/login" />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Redirect to="/login" />;
  if (user.role !== 'ADMIN') return <Redirect to="/" />;
  return <AdminLayout>{children}</AdminLayout>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (user) return <Redirect to="/" />;
  return <>{children}</>;
}

function Loader() {
  return <div className="flex min-h-screen items-center justify-center text-muted-foreground text-sm">Carregando...</div>;
}

function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const [location] = useLocation();
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const fecharMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 h-16">

          {/* Logo + navegação */}
          <div className="flex items-center gap-3 sm:gap-6">
            {/* Botão voltar — só no mobile e fora da home */}
            {location !== '/' && (
              <button
                onClick={() => window.history.back()}
                aria-label="Voltar"
                className="sm:hidden -ml-1 flex h-8 w-8 items-center justify-center text-foreground/70 hover:text-foreground transition"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
            )}
            <Link href="/" className="font-display text-xl font-bold uppercase tracking-[0.2em] text-foreground transition-opacity hover:opacity-70">
              Glympse
            </Link>
            <Link href="/produtos" className="text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground transition hidden sm:block">
              Produtos
            </Link>
            <Link href="/colecoes" className="text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground transition hidden sm:block">
              Coleções
            </Link>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2 sm:gap-3">
            <SearchBar />

            {user?.role === 'ADMIN' && (
              <Link href="/admin" className="hidden sm:block border border-border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-secondary hover:text-foreground transition">
                Admin
              </Link>
            )}

            <ThemeToggle />

            {user ? (
              <>
                {/* Favoritos */}
                <Link href="/wishlist" className="hidden sm:flex h-8 w-8 items-center justify-center text-foreground/70 hover:text-foreground transition" title="Favoritos">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.49 4.04 3 5.5l7 7Z"/></svg>
                </Link>
                {/* Sino de notificações */}
                <NotificationBell />
                {/* Pedidos */}
                <Link href="/orders" className="text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground transition hidden sm:block" title="Meus pedidos">
                  Pedidos
                </Link>
                {/* Conta */}
                <Link href="/conta" className="text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground transition hidden sm:block" title="Minha conta">
                  {user.first_name}
                </Link>
                <button onClick={logout} className="hidden sm:block text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground transition">
                  Sair
                </button>
              </>
            ) : (
              <div className="hidden sm:flex items-center gap-3">
                <Link href="/login" className="text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground transition">
                  Entrar
                </Link>
                <Link
                  href="/register"
                  className="bg-primary px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-primary-foreground hover:opacity-80 transition"
                >
                  Cadastrar
                </Link>
              </div>
            )}

            {/* Carrinho — abre drawer ou vai para /cart */}
            <button
              onClick={() => setCartOpen(true)}
              className="relative flex h-8 w-8 items-center justify-center text-foreground/70 hover:text-foreground transition"
              title="Ver carrinho"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              {(cart?.quantity ?? 0) > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                  {cart!.quantity}
                </span>
              )}
            </button>

            {/* Menu hambúrguer — só no mobile */}
            <button
              onClick={() => setMenuOpen(v => !v)}
              aria-label="Menu"
              aria-expanded={menuOpen}
              className="sm:hidden flex h-8 w-8 items-center justify-center text-foreground/70 hover:text-foreground transition"
            >
              {menuOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></svg>
              )}
            </button>
          </div>
        </div>

        {/* Menu mobile (dropdown) — aparece ao tocar no hambúrguer */}
        {menuOpen && (
          <nav className="sm:hidden border-t border-border bg-background px-4">
            <div className="mx-auto flex max-w-7xl flex-col divide-y divide-border">
              <Link href="/produtos" onClick={fecharMenu} className="py-3 text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground transition">Produtos</Link>
              <Link href="/colecoes" onClick={fecharMenu} className="py-3 text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground transition">Coleções</Link>
              {user ? (
                <>
                  <Link href="/wishlist" onClick={fecharMenu} className="py-3 text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground transition">Favoritos</Link>
                  <Link href="/orders" onClick={fecharMenu} className="py-3 text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground transition">Pedidos</Link>
                  <Link href="/conta" onClick={fecharMenu} className="py-3 text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground transition">Minha conta</Link>
                  {user.role === 'ADMIN' && (
                    <Link href="/admin" onClick={fecharMenu} className="py-3 text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground transition">Painel Admin</Link>
                  )}
                  <button onClick={() => { fecharMenu(); logout(); }} className="py-3 text-left text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground transition">Sair</button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={fecharMenu} className="py-3 text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground transition">Entrar</Link>
                  <Link href="/register" onClick={fecharMenu} className="py-3 text-xs font-medium uppercase tracking-widest text-foreground transition">Cadastrar</Link>
                </>
              )}
            </div>
          </nav>
        )}
      </header>

      <main>{children}</main>

      <Footer />

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}

function Routes() {
  const [location] = useLocation();
  // Rola para o topo a cada troca de rota (senão a nova página abre na mesma
  // posição de rolagem da anterior — ex: clicar "Coleções" e cair lá embaixo)
  useEffect(() => { window.scrollTo(0, 0); }, [location]);

  return (
    <Switch>
      <Route path="/login">
        <PublicOnlyRoute><Layout><LoginPage /></Layout></PublicOnlyRoute>
      </Route>

      <Route path="/register">
        <PublicOnlyRoute><Layout><RegisterPage /></Layout></PublicOnlyRoute>
      </Route>

      {/* ── Painel administrativo ── */}
      <Route path="/admin"><AdminRoute><AdminDashboard /></AdminRoute></Route>
      <Route path="/admin/orders/:id"><AdminRoute><AdminOrderDetail /></AdminRoute></Route>
      <Route path="/admin/orders"><AdminRoute><AdminOrders /></AdminRoute></Route>
      <Route path="/admin/products/:id"><AdminRoute><AdminProductDetail /></AdminRoute></Route>
      <Route path="/admin/products"><AdminRoute><AdminCatalog /></AdminRoute></Route>
      <Route path="/admin/inventory"><AdminRoute><AdminInventoryPage /></AdminRoute></Route>
      <Route path="/admin/returns"><AdminRoute><AdminReturns /></AdminRoute></Route>
      <Route path="/admin/reviews"><AdminRoute><AdminReviews /></AdminRoute></Route>
      <Route path="/admin/users"><AdminRoute><AdminUsersPage /></AdminRoute></Route>

      {/* ── Loja ── */}
      <Route path="/colecoes/:id">
        <Layout><CollectionDetailPage /></Layout>
      </Route>

      <Route path="/colecoes">
        <Layout><CollectionsPage /></Layout>
      </Route>

      <Route path="/products/:slug">
        <Layout><ProductDetailPage /></Layout>
      </Route>

      <Route path="/cart">
        <Layout><CartPage /></Layout>
      </Route>

      <Route path="/wishlist">
        <Layout><WishlistPage /></Layout>
      </Route>

      <Route path="/checkout">
        <Layout><CheckoutPage /></Layout>
      </Route>

      <Route path="/conta">
        <PrivateRoute><Layout><ProfilePage /></Layout></PrivateRoute>
      </Route>

      <Route path="/orders/:id">
        <Layout><OrderDetailPage /></Layout>
      </Route>

      <Route path="/orders">
        <PrivateRoute><Layout><OrdersPage /></Layout></PrivateRoute>
      </Route>

      <Route path="/payment/:orderId">
        <PrivateRoute><Layout><PaymentPage /></Layout></PrivateRoute>
      </Route>

      <Route path="/returns">
        <PrivateRoute><Layout><ReturnsPage /></Layout></PrivateRoute>
      </Route>

      {/* Páginas institucionais */}
      <Route path="/entrega">
        <Layout><ShippingPage /></Layout>
      </Route>
      <Route path="/contato">
        <Layout><ContactPage /></Layout>
      </Route>

      {/* Listagem completa de produtos */}
      <Route path="/produtos">
        <Layout><ProductsPage /></Layout>
      </Route>

      {/* Home (vitrine) */}
      <Route path="/">
        <Layout><HomePage /></Layout>
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <NotificationProvider>
              <Routes />
            </NotificationProvider>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
