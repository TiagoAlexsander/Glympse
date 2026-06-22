import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { api } from '@/services/api';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatarReal } from '@/utils';

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Address = {
  id: number;
  label: string | null;
  recipient_name: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
};

type ShippingMethod = {
  id: number;
  name: string;
  type: string;
  description: string | null;
  price: number;
  free_above: number | null;
  estimated_days_min: number | null;
  estimated_days_max: number | null;
  effective_price: number;
  is_free: boolean;
};

type NewAddressForm = {
  label: string;
  recipient_name: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
};

// ── Componente ────────────────────────────────────────────────────────────────

export function CheckoutPage() {
  const [, navigate]  = useLocation();
  const { user }      = useAuth();
  const { cart, loadCart } = useCart();

  // Dados carregados
  const [addresses, setAddresses]   = useState<Address[]>([]);
  const [shipping, setShipping]     = useState<ShippingMethod[]>([]);
  const [subtotal, setSubtotal]     = useState(0);

  // Selecionados
  const [selectedAddress,  setSelectedAddress]  = useState<number | null>(null);
  const [selectedShipping, setSelectedShipping] = useState<number | null>(null);

  // Cupom de desconto
  const [couponInput,  setCouponInput]  = useState('');
  const [couponCode,   setCouponCode]   = useState<string | null>(null);
  const [desconto,     setDesconto]     = useState(0);
  const [couponErro,   setCouponErro]   = useState<string | null>(null);
  const [aplicandoCupom, setAplicandoCupom] = useState(false);

  // UI
  const [loadingData, setLoadingData]   = useState(true);
  const [placing,     setPlacing]       = useState(false);
  const [erro,        setErro]          = useState<string | null>(null);

  // Formulário de novo endereço
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [savingAddress,  setSavingAddress]  = useState(false);
  const [buscandoCep,    setBuscandoCep]    = useState(false);
  const [newAddr, setNewAddr] = useState<NewAddressForm>({
    label: '', recipient_name: '', street: '', number: '', complement: '',
    neighborhood: '', city: '', state: '', zip_code: '', country: 'Brasil',
  });

  // ── Carrega dados iniciais ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { navigate('/register'); return; }

    async function carregar() {
      setLoadingData(true);
      try {
        const [addrRes, shipRes] = await Promise.all([
          api.get('/users/me/addresses'),
          api.get('/orders/shipping-methods'),
        ]);
        const addrs = addrRes.data.data.addresses as Address[];
        const ships = shipRes.data.data.shipping_methods as ShippingMethod[];

        setAddresses(addrs);
        setShipping(ships);
        setSubtotal(shipRes.data.data.subtotal);

        // Pré-seleciona o endereço padrão ou o primeiro
        const defaultAddr = (addrRes.data.data.addresses as any[]).find(a => a.is_default)?.id ?? addrs[0]?.id ?? null;
        setSelectedAddress(defaultAddr);

        // Pré-seleciona o método mais barato
        if (ships.length > 0) {
          const maisBarato = ships.reduce((a, b) => a.effective_price <= b.effective_price ? a : b);
          setSelectedShipping(maisBarato.id);
        }
      } catch (e: any) {
        setErro(e?.response?.data?.error ?? 'Erro ao carregar checkout.');
      } finally {
        setLoadingData(false);
      }
    }
    carregar();
  }, [user]);

  // ── Busca endereço pelo CEP (ViaCEP) ───────────────────────────────────────
  async function buscarCep(cep: string) {
    const limpo = cep.replace(/\D/g, '');
    if (limpo.length !== 8) return;
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setNewAddr(p => ({
          ...p,
          street:       data.logradouro || p.street,
          neighborhood: data.bairro     || p.neighborhood,
          city:         data.localidade || p.city,
          state:        data.uf         || p.state,
        }));
      }
    } catch {
      // ViaCEP fora do ar — usuário preenche manualmente
    } finally {
      setBuscandoCep(false);
    }
  }

  // ── Salvar novo endereço ────────────────────────────────────────────────────
  async function salvarNovoEndereco() {
    // Mesmos campos obrigatórios do backend
    const faltando: string[] = [];
    if (!newAddr.recipient_name) faltando.push('nome do destinatário');
    if (!newAddr.street)         faltando.push('rua');
    if (!newAddr.number)         faltando.push('número');
    if (!newAddr.neighborhood)   faltando.push('bairro');
    if (!newAddr.city)           faltando.push('cidade');
    if (!newAddr.state)          faltando.push('estado');
    if (!newAddr.zip_code)       faltando.push('CEP');
    if (faltando.length > 0) {
      alert(`Preencha os campos: ${faltando.join(', ')}.`);
      return;
    }
    setSavingAddress(true);
    try {
      const res = await api.post('/users/me/addresses', newAddr);
      const criado = res.data.data.address as Address;
      setAddresses(prev => [...prev, criado]);
      setSelectedAddress(criado.id);
      setShowNewAddress(false);
      setNewAddr({ label: '', recipient_name: '', street: '', number: '', complement: '',
                   neighborhood: '', city: '', state: '', zip_code: '', country: 'Brasil' });
    } catch (e: any) {
      alert(e?.response?.data?.error ?? 'Erro ao salvar endereço.');
    } finally {
      setSavingAddress(false);
    }
  }

  // ── Finalizar pedido ────────────────────────────────────────────────────────
  async function finalizarPedido() {
    if (!selectedAddress || !selectedShipping) return; // botão já está disabled
    setPlacing(true);
    setErro(null);
    try {
      const res = await api.post('/orders', {
        address_id:        selectedAddress,
        shipping_method_id: selectedShipping,
      });
      const orderId = res.data.data.order.id;
      try { await loadCart(); } catch {} // atualiza contagem; ignora falha
      navigate(`/payment/${orderId}`);
    } catch (e: any) {
      setErro(e?.response?.data?.error ?? 'Erro ao criar pedido. Tente novamente.');
      setPlacing(false);
    }
  }

  // ── Cupom ───────────────────────────────────────────────────────────────────
  async function aplicarCupom() {
    if (!couponInput.trim()) return;
    setAplicandoCupom(true);
    setCouponErro(null);
    try {
      const res = await api.post('/cart/coupon', { code: couponInput.trim() });
      const c = res.data.data.cart;
      setCouponCode(c.coupon_code ?? couponInput.trim().toUpperCase());
      setDesconto(c.discount ?? 0);
      setCouponInput('');
    } catch (e: any) {
      setCouponErro(e?.response?.data?.error ?? 'Cupom inválido.');
    } finally {
      setAplicandoCupom(false);
    }
  }

  async function removerCupom() {
    try {
      await api.delete('/cart/coupon');
    } catch {}
    setCouponCode(null);
    setDesconto(0);
    setCouponErro(null);
  }

  // ── Cálculos para o resumo ──────────────────────────────────────────────────
  const shippingMethod = shipping.find(s => s.id === selectedShipping);
  const freteValor     = shippingMethod?.effective_price ?? 0;
  const total          = Math.max(0, subtotal - desconto + freteValor);
  const items          = cart?.items ?? [];

  // ── Renderização ───────────────────────────────────────────────────────────
  if (loadingData) {
    return <p className="py-20 text-center text-xs uppercase tracking-widest text-muted-foreground">Carregando checkout...</p>;
  }

  if (!cart || items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">Seu carrinho está vazio.</p>
        <Link href="/" className="bg-primary px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-primary-foreground hover:opacity-80 transition">
          Continuar comprando
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-8 font-display text-2xl font-bold uppercase tracking-tight border-b border-border pb-6">Checkout</h1>

      {/* Erro geral de API (ex: estoque insuficiente) */}
      {erro && !erro.startsWith('__local') && (
        <div className="mb-4 border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {erro}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

        {/* ── Coluna esquerda: endereço + frete ─────────────────────────── */}
        <div className="lg:col-span-2 space-y-8">

          {/* Endereço de entrega */}
          <section>
            <h2 className="mb-3 text-[11px] font-bold text-foreground uppercase tracking-widest">
              Endereço de entrega
            </h2>

            {addresses.length === 0 && !showNewAddress && (
              <p className="text-sm text-muted-foreground">Você não tem endereços cadastrados.</p>
            )}

            <div className="space-y-2">
              {addresses.map(addr => (
                <label
                  key={addr.id}
                  className={`flex cursor-pointer gap-3 border p-4 transition ${
                    selectedAddress === addr.id
                      ? 'border-foreground bg-secondary'
                      : 'border-border bg-card hover:border-foreground'
                  }`}
                >
                  <input
                    type="radio"
                    name="address"
                    value={addr.id}
                    checked={selectedAddress === addr.id}
                    onChange={() => setSelectedAddress(addr.id)}
                    className="mt-0.5 accent-foreground"
                  />
                  <div className="text-sm">
                    {addr.label && <p className="font-display text-xs font-bold uppercase tracking-wide">{addr.label}</p>}
                    <p className="text-foreground mt-1">{addr.recipient_name}</p>
                    <p className="text-muted-foreground">
                      {addr.street}, {addr.number}{addr.complement ? ` — ${addr.complement}` : ''}
                    </p>
                    <p className="text-muted-foreground">
                      {addr.neighborhood}, {addr.city} — {addr.state}, {addr.zip_code}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {/* Formulário de novo endereço */}
            {showNewAddress ? (
              <div className="mt-3 border border-border p-4 space-y-3">
                <p className="font-display text-xs font-bold uppercase tracking-widest">Novo endereço</p>

                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Apelido (ex: Casa)" value={newAddr.label}
                    onChange={e => setNewAddr(p => ({ ...p, label: e.target.value }))}
                    className="col-span-2 border border-input bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />

                  <input placeholder="Nome do destinatário *" value={newAddr.recipient_name}
                    onChange={e => setNewAddr(p => ({ ...p, recipient_name: e.target.value }))}
                    className="col-span-2 border border-input bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />

                  {/* CEP primeiro — preenche o resto automaticamente via ViaCEP */}
                  <div className="relative">
                    <input placeholder="CEP *" value={newAddr.zip_code}
                      onChange={e => {
                        const v = e.target.value;
                        setNewAddr(p => ({ ...p, zip_code: v }));
                        buscarCep(v); // dispara quando completar 8 dígitos
                      }}
                      maxLength={9}
                      className="w-full border border-input bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />
                    {buscandoCep && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-wider text-muted-foreground">buscando...</span>
                    )}
                  </div>

                  <input placeholder="Número *" value={newAddr.number}
                    onChange={e => setNewAddr(p => ({ ...p, number: e.target.value }))}
                    className="border border-input bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />

                  <input placeholder="Rua / Avenida *" value={newAddr.street}
                    onChange={e => setNewAddr(p => ({ ...p, street: e.target.value }))}
                    className="col-span-2 border border-input bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />

                  <input placeholder="Complemento" value={newAddr.complement}
                    onChange={e => setNewAddr(p => ({ ...p, complement: e.target.value }))}
                    className="border border-input bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />

                  <input placeholder="Bairro *" value={newAddr.neighborhood}
                    onChange={e => setNewAddr(p => ({ ...p, neighborhood: e.target.value }))}
                    className="border border-input bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />

                  <input placeholder="Cidade *" value={newAddr.city}
                    onChange={e => setNewAddr(p => ({ ...p, city: e.target.value }))}
                    className="border border-input bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />

                  <input placeholder="Estado (UF) *" maxLength={2} value={newAddr.state}
                    onChange={e => setNewAddr(p => ({ ...p, state: e.target.value.toUpperCase() }))}
                    className="border border-input bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={salvarNovoEndereco}
                    disabled={savingAddress}
                    className="bg-primary px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-primary-foreground hover:opacity-80 disabled:opacity-50"
                  >
                    {savingAddress ? 'Salvando...' : 'Salvar endereço'}
                  </button>
                  <button
                    onClick={() => setShowNewAddress(false)}
                    className="border border-border px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewAddress(true)}
                className="mt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground border-b border-current pb-0.5"
              >
                + Adicionar novo endereço
              </button>
            )}
          </section>

          {/* Método de frete */}
          <section>
            <h2 className="mb-3 text-[11px] font-bold text-foreground uppercase tracking-widest">
              Método de entrega
            </h2>

            <div className="space-y-2">
              {shipping.map(method => (
                <label
                  key={method.id}
                  className={`flex cursor-pointer gap-3 border p-4 transition ${
                    selectedShipping === method.id
                      ? 'border-foreground bg-secondary'
                      : 'border-border bg-card hover:border-foreground'
                  }`}
                >
                  <input
                    type="radio"
                    name="shipping"
                    value={method.id}
                    checked={selectedShipping === method.id}
                    onChange={() => setSelectedShipping(method.id)}
                    className="mt-0.5 accent-foreground"
                  />
                  <div className="flex-1 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-display text-xs font-bold uppercase tracking-wide">{method.name}</p>
                      <div className="text-right">
                        {method.is_free ? (
                          <span className="font-mono font-bold text-success">Grátis</span>
                        ) : (
                          <span className="font-mono font-bold">
                            {formatarReal(method.effective_price)}
                          </span>
                        )}
                        {!method.is_free && method.free_above && (
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Grátis acima de {formatarReal(method.free_above)}
                          </p>
                        )}
                      </div>
                    </div>
                    {method.description && (
                      <p className="text-muted-foreground mt-0.5">{method.description}</p>
                    )}
                    {method.estimated_days_min !== null && (
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                        {method.estimated_days_min === 0
                          ? 'Entrega no mesmo dia'
                          : method.estimated_days_min === method.estimated_days_max
                            ? `${method.estimated_days_min} dia(s) úteis`
                            : `${method.estimated_days_min}–${method.estimated_days_max} dias úteis`
                        }
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* ── Resumo do pedido ──────────────────────────────────────────── */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 border border-border bg-card p-5">
            <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-widest">Resumo</h2>

            {/* Itens resumidos */}
            <div className="mb-4 space-y-3 max-h-48 overflow-y-auto">
              {items.map(item => (
                <div key={item.id} className="flex gap-3">
                  {item.product.image ? (
                    <img
                      src={item.product.image.url}
                      alt={item.product.image.alt_text}
                      className="h-14 w-11 object-cover bg-secondary shrink-0"
                    />
                  ) : (
                    <div className="h-14 w-11 bg-secondary shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-[11px] font-bold uppercase tracking-wide truncate">{item.product.name}</p>
                    {Object.entries(item.variant.attributes).map(([k, v]) => (
                      <p key={k} className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}: {v}</p>
                    ))}
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Qtd: {item.quantity}</p>
                  </div>
                  <p className="font-mono text-xs font-bold shrink-0">
                    {formatarReal(item.unit_price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>

            {/* Cupom de desconto */}
            <div className="border-t border-border pt-4">
              {couponCode ? (
                <div className="flex items-center justify-between border border-success/40 bg-success/10 px-3 py-2">
                  <span className="text-xs text-success">
                    ✓ Cupom <strong>{couponCode}</strong> aplicado
                  </span>
                  <button onClick={removerCupom} className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-destructive">remover</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="CUPOM"
                    value={couponInput}
                    onChange={e => setCouponInput(e.target.value.toUpperCase())}
                    className="flex-1 border border-input bg-background px-3 py-2 text-sm uppercase tracking-wider outline-none focus:border-foreground"
                  />
                  <button
                    onClick={aplicarCupom}
                    disabled={aplicandoCupom || !couponInput.trim()}
                    className="border border-border px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-foreground hover:bg-secondary disabled:opacity-50"
                  >
                    {aplicandoCupom ? '...' : 'Aplicar'}
                  </button>
                </div>
              )}
              {couponErro && <p className="mt-1.5 text-xs text-destructive">{couponErro}</p>}
            </div>

            <div className="border-t border-border mt-4 pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span className="text-xs uppercase tracking-wider">Subtotal</span>
                <span className="font-mono">{formatarReal(subtotal)}</span>
              </div>
              {desconto > 0 && (
                <div className="flex justify-between text-success">
                  <span className="text-xs uppercase tracking-wider">Desconto</span>
                  <span className="font-mono">− {formatarReal(desconto)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span className="text-xs uppercase tracking-wider">Frete</span>
                <span className="font-mono">
                  {shippingMethod
                    ? freteValor === 0
                      ? <span className="text-success font-bold">Grátis</span>
                      : formatarReal(freteValor)
                    : '—'
                  }
                </span>
              </div>
            </div>

            <div className="my-3 border-t border-border" />

            <div className="flex justify-between items-baseline">
              <span className="text-xs font-bold uppercase tracking-widest">Total</span>
              <span className="font-mono text-lg font-bold">{formatarReal(total)}</span>
            </div>

            {/* Todos os erros e avisos ficam perto do botão */}
            {erro && (
              <div className="mt-3 border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {erro.replace('__local:', '')}
              </div>
            )}
            {!erro && !selectedAddress && (
              <p className="mt-3 border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                ⚠ Adicione e selecione um endereço de entrega.
              </p>
            )}
            {!erro && selectedAddress && shipping.length === 0 && (
              <p className="mt-3 border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                Nenhum método de frete disponível.
              </p>
            )}
            {!erro && selectedAddress && shipping.length > 0 && !selectedShipping && (
              <p className="mt-3 border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                ⚠ Selecione um método de entrega.
              </p>
            )}

            <button
              onClick={finalizarPedido}
              disabled={placing || !selectedAddress || !selectedShipping}
              className="mt-4 w-full bg-primary py-3.5 text-[11px] font-bold uppercase tracking-widest text-primary-foreground hover:opacity-80 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {placing ? 'Processando...' : 'Confirmar pedido'}
            </button>

            <Link href="/cart" className="mt-3 block text-center text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground">
              ← Voltar ao carrinho
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
