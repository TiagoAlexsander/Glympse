import { Link } from 'wouter';

// Rodapé da loja
export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-12 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1">
          <h3 className="font-display text-xl font-bold uppercase tracking-[0.2em]">Glympse</h3>
          <p className="mt-3 text-xs text-muted-foreground leading-relaxed max-w-[200px]">
            Moda minimalista, exclusiva e atemporal.
          </p>
        </div>
        <div>
          <h4 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Loja</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/produtos" className="text-foreground/80 hover:text-foreground">Produtos</Link></li>
            <li><Link href="/colecoes" className="text-foreground/80 hover:text-foreground">Coleções</Link></li>
            <li><Link href="/produtos?categoria=" className="text-foreground/80 hover:text-foreground">Novidades</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Conta</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/conta" className="text-foreground/80 hover:text-foreground">Minha conta</Link></li>
            <li><Link href="/orders" className="text-foreground/80 hover:text-foreground">Meus pedidos</Link></li>
            <li><Link href="/wishlist" className="text-foreground/80 hover:text-foreground">Favoritos</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ajuda</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/returns" className="text-foreground/80 hover:text-foreground">Trocas e devoluções</Link></li>
            <li><span className="text-foreground/80">Entrega e frete</span></li>
            <li><span className="text-foreground/80">Contato</span></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-7xl px-4 py-6 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
          © {new Date().getFullYear()} Glympse. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
