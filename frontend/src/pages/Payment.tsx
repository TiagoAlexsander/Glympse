import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useRoute } from 'wouter';
import { api } from '@/services/api';
import { formatarReal } from '@/utils';

// ── Tipos ─────────────────────────────────────────────────────────────────────

type PixData = {
  transaction_id: string;
  amount: number;
  order_number: string;
  pix_copia_cola: string;
  qr_code_url: string;
  expires_in: number;
};

type CardForm = {
  card_number: string;
  card_holder: string;
  expiry_month: string;
  expiry_year: string;
  cvv: string;
  installments: number;
};

type PaymentStatus = {
  order_id: number;
  order_number: string;
  order_status: string;
  payment_status: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

// Formata número do cartão com espaços a cada 4 dígitos
function formatarCartao(valor: string): string {
  return valor.replace(/\D/g, '').substring(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

// Detecta bandeira pelo primeiro dígito
function detectarBandeira(numero: string): string {
  const n = numero.replace(/\s/g, '');
  if (n.startsWith('4')) return 'Visa';
  if (n.startsWith('5')) return 'Mastercard';
  if (n.startsWith('3')) return 'Amex';
  if (n.startsWith('6')) return 'Elo';
  return '';
}

// ── Componente ────────────────────────────────────────────────────────────────

export function PaymentPage() {
  const [match, params] = useRoute<{ orderId: string }>('/payment/:orderId');
  const [, navigate]    = useLocation();

  const orderId = params?.orderId ?? '';

  // Aba ativa: 'pix' | 'card'
  const [aba, setAba] = useState<'pix' | 'card'>('pix');

  // Estado PIX
  const [pixData,       setPixData]       = useState<PixData | null>(null);
  const [loadingPix,    setLoadingPix]    = useState(false);
  const [copiado,       setCopiado]       = useState(false);

  // Estado Cartão
  const [card, setCard] = useState<CardForm>({
    card_number: '', card_holder: '', expiry_month: '',
    expiry_year: '', cvv: '', installments: 1,
  });
  const [processingCard, setProcessingCard] = useState(false);
  const [cardErro,       setCardErro]       = useState<string | null>(null);

  // Estado geral
  const [status,    setStatus]    = useState<PaymentStatus | null>(null);
  const [pago,      setPago]      = useState(false);
  const [simulating, setSimulating] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Carrega status do pedido ────────────────────────────────────────────────
  useEffect(() => {
    if (!orderId) return;
    api.get(`/payments/${orderId}/status`)
      .then(res => {
        const s = res.data.data as PaymentStatus;
        setStatus(s);
        if (s.payment_status === 'PAID') setPago(true);
      })
      .catch(() => {});
  }, [orderId]);

  // ── Polling de status (verifica a cada 3s quando PIX está pendente) ─────────
  useEffect(() => {
    if (pago || aba !== 'pix' || !pixData) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }
    pollingRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/payments/${orderId}/status`);
        const s   = res.data.data as PaymentStatus;
        if (s.payment_status === 'PAID') {
          setPago(true);
          clearInterval(pollingRef.current!);
        }
      } catch {}
    }, 3000);

    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [pago, aba, pixData, orderId]);

  // ── Gerar cobrança PIX ──────────────────────────────────────────────────────
  async function gerarPix() {
    setLoadingPix(true);
    try {
      const res = await api.post(`/payments/${orderId}/pix`);
      setPixData(res.data.data);
    } catch (e: any) {
      alert(e?.response?.data?.error ?? 'Erro ao gerar PIX.');
    } finally {
      setLoadingPix(false);
    }
  }

  useEffect(() => {
    if (aba === 'pix' && !pixData && !pago && orderId) gerarPix();
  }, [aba, orderId]);

  // ── Copiar código PIX ───────────────────────────────────────────────────────
  function copiarPix() {
    if (!pixData) return;
    navigator.clipboard.writeText(pixData.pix_copia_cola).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  }

  // ── Pagar com cartão ────────────────────────────────────────────────────────
  async function pagarCartao() {
    if (!card.card_number || !card.card_holder || !card.expiry_month || !card.expiry_year || !card.cvv) {
      setCardErro('Preencha todos os dados do cartão.');
      return;
    }
    // Validação de validade: mês 1–12 e data não vencida
    const mes = parseInt(card.expiry_month, 10);
    const ano = 2000 + parseInt(card.expiry_year, 10);
    if (mes < 1 || mes > 12) {
      setCardErro('Mês de validade inválido (use 01 a 12).');
      return;
    }
    const agora = new Date();
    const vencimento = new Date(ano, mes); // 1º dia do mês seguinte ao vencimento
    if (vencimento <= agora) {
      setCardErro('Cartão vencido. Verifique a validade.');
      return;
    }
    setProcessingCard(true);
    setCardErro(null);
    try {
      await api.post(`/payments/${orderId}/card`, card);
      setPago(true);
    } catch (e: any) {
      setCardErro(e?.response?.data?.error ?? 'Pagamento recusado.');
    } finally {
      setProcessingCard(false);
    }
  }

  // ── Simular pagamento aprovado (só dev) ─────────────────────────────────────
  async function simularPagamento() {
    setSimulating(true);
    try {
      await api.post(`/payments/${orderId}/simulate`);
      setPago(true);
    } catch (e: any) {
      alert(e?.response?.data?.error ?? 'Erro ao simular.');
    } finally {
      setSimulating(false);
    }
  }

  // ── Tela de sucesso ─────────────────────────────────────────────────────────
  if (pago) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success text-success-foreground">
          <span className="text-4xl">✓</span>
        </div>
        <div>
          <h1 className="font-display text-xl font-bold uppercase tracking-tight">Pagamento aprovado!</h1>
          {status?.order_number && (
            <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">Pedido {status.order_number} confirmado</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">Você receberá atualizações sobre a entrega em breve.</p>
        </div>
        <div className="flex gap-3">
          <Link href={`/orders/${orderId}`}
            className="bg-primary px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-primary-foreground hover:opacity-80 transition">
            Ver pedido
          </Link>
          <Link href="/"
            className="border border-border px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition">
            Continuar comprando
          </Link>
        </div>
      </div>
    );
  }

  // ── Renderização principal ──────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-md px-4 py-10">

      <div className="mb-6">
        <Link href={`/orders/${orderId}`} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">
          ← Voltar ao pedido
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold uppercase tracking-tight">Pagamento</h1>
        {status && (
          <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1">
            Pedido {status.order_number} · <span className="font-mono">{pixData ? formatarReal(pixData.amount) : '...'}</span>
          </p>
        )}
      </div>

      {/* Abas */}
      <div className="mb-5 flex border border-border">
        {(['pix', 'card'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setAba(tab)}
            className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-widest transition ${
              aba === tab ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'pix' ? 'PIX' : 'Cartão'}
          </button>
        ))}
      </div>

      {/* ── Aba PIX ───────────────────────────────────────────────────────── */}
      {aba === 'pix' && (
        <div className="border border-border bg-card p-6">
          {loadingPix ? (
            <p className="text-center text-xs uppercase tracking-widest text-muted-foreground py-10">Gerando cobrança PIX...</p>
          ) : pixData ? (
            <div className="flex flex-col items-center gap-4">
              {/* QR Code */}
              <img
                src={pixData.qr_code_url}
                alt="QR Code PIX"
                className="h-44 w-44 border border-border bg-white"
              />

              <div className="text-center">
                <p className="font-mono text-lg font-bold">
                  {formatarReal(pixData.amount)}
                </p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                  Escaneie o QR Code ou copie o código abaixo
                </p>
              </div>

              {/* Código copia e cola */}
              <div className="w-full bg-secondary border border-border p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Código PIX Copia e Cola</p>
                <p className="text-xs text-foreground break-all font-mono leading-relaxed line-clamp-3">
                  {pixData.pix_copia_cola}
                </p>
              </div>

              <button
                onClick={copiarPix}
                className={`w-full py-3 text-[11px] font-bold uppercase tracking-widest transition ${
                  copiado ? 'bg-success text-success-foreground' : 'bg-primary text-primary-foreground hover:opacity-80'
                }`}
              >
                {copiado ? '✓ Código copiado' : 'Copiar código PIX'}
              </button>

              <p className="text-[10px] uppercase tracking-widest text-muted-foreground text-center">
                Aguardando confirmação do pagamento
                <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-foreground animate-pulse" />
              </p>
            </div>
          ) : (
            <button onClick={gerarPix} className="w-full bg-primary py-3 text-[11px] font-bold uppercase tracking-widest text-primary-foreground hover:opacity-80">
              Gerar PIX
            </button>
          )}
        </div>
      )}

      {/* ── Aba Cartão ────────────────────────────────────────────────────── */}
      {aba === 'card' && (
        <div className="border border-border bg-card p-5 space-y-3">

          {/* Número do cartão */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">Número do cartão</label>
            <div className="relative">
              <input
                type="text" inputMode="numeric" placeholder="0000 0000 0000 0000" maxLength={19}
                value={card.card_number}
                onChange={e => setCard(p => ({ ...p, card_number: formatarCartao(e.target.value) }))}
                className="w-full border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground pr-16 font-mono"
              />
              {detectarBandeira(card.card_number) && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                  {detectarBandeira(card.card_number)}
                </span>
              )}
            </div>
          </div>

          {/* Nome no cartão */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">Nome no cartão</label>
            <input
              type="text" placeholder="NOME SOBRENOME"
              value={card.card_holder}
              onChange={e => setCard(p => ({ ...p, card_holder: e.target.value.toUpperCase() }))}
              className="w-full border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground"
            />
          </div>

          {/* Validade e CVV */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">Mês</label>
              <input
                type="text" inputMode="numeric" placeholder="MM" maxLength={2}
                value={card.expiry_month}
                onChange={e => setCard(p => ({ ...p, expiry_month: e.target.value.replace(/\D/g, '') }))}
                className="w-full border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground text-center font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">Ano</label>
              <input
                type="text" inputMode="numeric" placeholder="AA" maxLength={2}
                value={card.expiry_year}
                onChange={e => setCard(p => ({ ...p, expiry_year: e.target.value.replace(/\D/g, '') }))}
                className="w-full border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground text-center font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">CVV</label>
              <input
                type="text" inputMode="numeric" placeholder="123" maxLength={4}
                value={card.cvv}
                onChange={e => setCard(p => ({ ...p, cvv: e.target.value.replace(/\D/g, '') }))}
                className="w-full border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground text-center font-mono"
              />
            </div>
          </div>

          {/* Parcelas */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">Parcelas</label>
            <select
              value={card.installments}
              onChange={e => setCard(p => ({ ...p, installments: parseInt(e.target.value) }))}
              className="w-full border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground"
            >
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => {
                const valor = status ? (pixData?.amount ?? 0) / n : 0;
                return (
                  <option key={n} value={n}>
                    {n}x {n > 1 && valor > 0 ? `de ${formatarReal(valor)}` : '(sem juros)'}
                  </option>
                );
              })}
            </select>
          </div>

          {cardErro && (
            <p className="border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {cardErro}
            </p>
          )}

          <button
            onClick={pagarCartao}
            disabled={processingCard}
            className="w-full bg-primary py-3 text-[11px] font-bold uppercase tracking-widest text-primary-foreground hover:opacity-80 transition disabled:opacity-50"
          >
            {processingCard ? 'Processando...' : 'Pagar com cartão'}
          </button>

          {/* Dica do mock */}
          <p className="text-center text-[10px] uppercase tracking-wider text-muted-foreground leading-relaxed">
            Teste: qualquer número válido aprova.
            Cartões terminados em <span className="font-mono">0000</span>, <span className="font-mono">1111</span> ou <span className="font-mono">9999</span> são recusados.
          </p>
        </div>
      )}

      {/* ── Botão de simulação (só em desenvolvimento) ──────────────────── */}
      {import.meta.env.DEV && (
        <div className="mt-5 border border-dashed border-foreground/40 bg-secondary p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-foreground mb-2">
            🛠 Ambiente de desenvolvimento
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Simula a confirmação que o Mercado Pago enviaria via webhook após o pagamento real.
          </p>
          <button
            onClick={simularPagamento}
            disabled={simulating}
            className="w-full border border-foreground bg-background py-2.5 text-[11px] font-bold uppercase tracking-widest text-foreground hover:bg-foreground hover:text-background transition disabled:opacity-50"
          >
            {simulating ? 'Simulando...' : '⚡ Simular pagamento aprovado'}
          </button>
        </div>
      )}
    </div>
  );
}
