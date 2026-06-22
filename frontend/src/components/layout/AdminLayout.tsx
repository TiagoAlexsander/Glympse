import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';

// Itens do menu lateral do painel administrativo
const MENU = [
  { href: '/admin',            label: 'Início',      icon: '🏠', exact: true },
  { href: '/admin/orders',     label: 'Pedidos',     icon: '📦' },
  { href: '/admin/products',   label: 'Produtos',    icon: '👕' },
  { href: '/admin/inventory',  label: 'Estoque',     icon: '📊' },
  { href: '/admin/returns',    label: 'Devoluções',  icon: '↩️' },
  { href: '/admin/reviews',    label: 'Avaliações',  icon: '⭐' },
  { href: '/admin/users',      label: 'Usuários',    icon: '👥' },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  function estaAtivo(href: string, exact?: boolean) {
    if (exact) return location === href;
    return location === href || location.startsWith(href + '/');
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Topo */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-display text-base font-bold uppercase tracking-[0.2em]">
              Glympse
            </Link>
            <span className="border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">← Loja</Link>
            <ThemeToggle />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground hidden sm:block">{user?.first_name}</span>
            <button onClick={logout} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">Sair</button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Menu lateral */}
        <aside className="hidden md:block w-56 shrink-0 border-r border-border bg-background min-h-[calc(100vh-57px)] p-3">
          <nav className="space-y-1">
            {MENU.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 text-xs font-bold uppercase tracking-widest transition ${
                  estaAtivo(item.href, item.exact)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Menu horizontal no mobile */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex overflow-x-auto border-t border-border bg-background">
          {MENU.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap ${
                estaAtivo(item.href, item.exact) ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>

        {/* Conteúdo */}
        <main className="flex-1 min-w-0 pb-20 md:pb-0">{children}</main>
      </div>
    </div>
  );
}
