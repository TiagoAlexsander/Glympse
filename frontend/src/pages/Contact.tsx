import { Link } from 'wouter';

// Página de Contato
export function ContactPage() {
  const email = 'tiagoxalex.9@gmail.com';

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link href="/" className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground">← Voltar para a loja</Link>

      <h1 className="mt-3 font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight">Contato</h1>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        Qualquer dúvida, sugestão ou problema com um pedido? Será um prazer ajudar.
        Entre em contato e respondemos o mais rápido possível.
      </p>

      <div className="mt-8 border border-border bg-card p-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Responsável</p>
        <p className="mt-1 font-display text-base font-bold uppercase tracking-wide">Tiago Alexsander da Costa Antunes</p>

        <p className="mt-5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">E-mail</p>
        <a
          href={`mailto:${email}`}
          className="mt-1 inline-block font-mono text-sm text-foreground underline underline-offset-2 hover:opacity-70 break-all"
        >
          {email}
        </a>

        <a
          href={`mailto:${email}?subject=${encodeURIComponent('Contato — Glympse')}`}
          className="mt-6 block w-full bg-primary py-3 text-center text-[11px] font-bold uppercase tracking-widest text-primary-foreground transition hover:opacity-80"
        >
          Enviar e-mail
        </a>
      </div>

      <p className="mt-8 text-xs text-muted-foreground leading-relaxed">
        Para dúvidas sobre prazos e entrega, veja também a página de{' '}
        <Link href="/entrega" className="text-foreground underline underline-offset-2 hover:opacity-70">Entrega e Frete</Link>.
      </p>
    </div>
  );
}
