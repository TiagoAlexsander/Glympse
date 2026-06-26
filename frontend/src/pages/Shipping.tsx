import { Link } from 'wouter';

// Página informativa: Entrega e Frete
export function ShippingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground">← Voltar para a loja</Link>

      <h1 className="mt-3 font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight">Entrega e Frete</h1>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        Enviamos para todo o Brasil. O prazo e o valor do frete são calculados no checkout
        a partir do seu CEP, junto com o método de envio escolhido.
      </p>

      {/* Métodos de envio */}
      <section className="mt-10">
        <h2 className="font-display text-sm font-bold uppercase tracking-widest">Métodos de envio</h2>
        <div className="mt-4 divide-y divide-border border-y border-border">
          {[
            { nome: 'PAC', desc: 'Econômico — entrega em 5 a 12 dias úteis.' },
            { nome: 'SEDEX', desc: 'Expresso — entrega em 1 a 4 dias úteis.' },
            { nome: 'Motoboy', desc: 'Capitais e regiões metropolitanas — no mesmo dia ou no dia seguinte.' },
            { nome: 'Retirada na loja', desc: 'Sem custo de frete — retire em horário comercial.' },
          ].map(m => (
            <div key={m.nome} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-display text-xs font-bold uppercase tracking-widest">{m.nome}</span>
              <span className="text-sm text-muted-foreground">{m.desc}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Os prazos começam a contar após a confirmação do pagamento e podem variar conforme a região.
        </p>
      </section>

      {/* Frete grátis */}
      <section className="mt-10 border border-border bg-card p-6">
        <h2 className="font-display text-sm font-bold uppercase tracking-widest">Frete grátis</h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Compras <strong className="text-foreground">acima de R$ 299</strong> têm frete grátis na opção
          econômica (PAC) para todo o Brasil. O desconto é aplicado automaticamente no checkout.
        </p>
      </section>

      {/* Acompanhamento */}
      <section className="mt-10">
        <h2 className="font-display text-sm font-bold uppercase tracking-widest">Como acompanhar o pedido</h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Assim que o pedido é despachado, o código de rastreio fica disponível em
          {' '}<Link href="/orders" className="text-foreground underline underline-offset-2 hover:opacity-70">Meus pedidos</Link>,
          junto com o status atualizado da entrega. Você também recebe notificações a cada etapa
          (confirmado, enviado, entregue).
        </p>
      </section>

      {/* Trocas */}
      <section className="mt-10">
        <h2 className="font-display text-sm font-bold uppercase tracking-widest">Trocas e devoluções</h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Você tem até <strong className="text-foreground">30 dias</strong> para solicitar troca ou
          devolução. Veja como funciona em
          {' '}<Link href="/returns" className="text-foreground underline underline-offset-2 hover:opacity-70">Trocas e devoluções</Link>.
        </p>
      </section>

      <p className="mt-12 text-xs text-muted-foreground">
        Ficou com alguma dúvida sobre a entrega?{' '}
        <Link href="/contato" className="text-foreground underline underline-offset-2 hover:opacity-70">Fale com a gente</Link>.
      </p>
    </div>
  );
}
