import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { api } from '@/services/api';
import { ordemTamanho } from '@/utils';

type ProdutoEstoque = {
  id: number;
  name: string;
  slug: string;
  variant_count: number;
  estoque: number;
  reservado: number;
  disponivel: number;
  sem_estoque: boolean;
  estoque_baixo: boolean;
};
type CategoriaResumo = {
  category_id: number;
  category_name: string;
  produtos: ProdutoEstoque[];
  total_produtos: number;
  total_estoque: number;
  sem_estoque: number;
  estoque_baixo: number;
};
type Totais = { produtos: number; estoque: number; sem_estoque: number; estoque_baixo: number };

type Movimento = {
  id: number;
  type: string;
  quantity: number;
  reason: string | null;
  created_at: string;
  variant_sku: string | null;
  product_name: string | null;
};

const MOV_LABEL: Record<string, { txt: string; cor: string }> = {
  IN:         { txt: 'Entrada',  cor: 'text-success' },
  OUT:        { txt: 'Saída',    cor: 'text-red-500' },
  ADJUSTMENT: { txt: 'Ajuste',   cor: 'text-blue-600' },
  RESERVATION:{ txt: 'Reserva',  cor: 'text-muted-foreground' },
  RELEASE:    { txt: 'Liberação',cor: 'text-muted-foreground' },
};

export function AdminInventoryPage() {
  const [aba, setAba] = useState<'resumo' | 'historico'>('resumo');

  // Resumo
  const [categorias, setCategorias] = useState<CategoriaResumo[]>([]);
  const [totais, setTotais]         = useState<Totais | null>(null);
  const [loading, setLoading]       = useState(true);
  const [expandida, setExpandida]   = useState<number | null>(null);
  const [busca, setBusca]           = useState('');
  const [soSemEstoque, setSoSemEstoque]   = useState(false);
  const [soBaixo, setSoBaixo]             = useState(false);

  // Histórico
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [loadingMov, setLoadingMov] = useState(false);

  // Editor de estoque (modal)
  const [editandoProduto, setEditandoProduto] = useState<{ id: number; name: string } | null>(null);
  const [variantes, setVariantes] = useState<any[]>([]);
  const [carregandoVar, setCarregandoVar] = useState(false);
  // Movimento em edição por variante: { tipo, qtd, motivo }
  const [movForm, setMovForm] = useState<Record<number, { tipo: string; qtd: string; motivo: string }>>({});
  const [salvandoMov, setSalvandoMov] = useState<number | null>(null);

  function carregarResumo() {
    setLoading(true);
    api.get('/inventory/summary')
      .then(r => { setCategorias(r.data.data.categorias); setTotais(r.data.data.totais); })
      .finally(() => setLoading(false));
  }
  useEffect(() => { carregarResumo(); }, []);

  async function abrirEditor(produto: { id: number; name: string }) {
    setEditandoProduto(produto);
    setCarregandoVar(true);
    setVariantes([]);
    setMovForm({});
    try {
      const r = await api.get(`/products/admin/${produto.id}`);
      const vars = r.data.data.product.variants ?? [];
      // ordena por tamanho
      vars.sort((a: any, b: any) => ordemTamanho(String(Object.values(a.attributes)[0] ?? '')) - ordemTamanho(String(Object.values(b.attributes)[0] ?? '')));
      setVariantes(vars);
      const inicial: Record<number, any> = {};
      for (const v of vars) inicial[v.id] = { tipo: 'IN', qtd: '', motivo: '' };
      setMovForm(inicial);
    } finally {
      setCarregandoVar(false);
    }
  }

  // Salva todas as movimentações preenchidas de uma vez (um movimento por tamanho com qtd > 0)
  async function salvarTodos() {
    const pendentes = Object.entries(movForm)
      .map(([id, f]) => ({ id: Number(id), ...f }))
      .filter(f => f.qtd && parseInt(f.qtd, 10) > 0);

    if (pendentes.length === 0) { alert('Preencha a quantidade de pelo menos um tamanho.'); return; }

    setSalvandoMov(-1); // -1 = salvando tudo
    try {
      for (const f of pendentes) {
        await api.post('/inventory/movements', {
          variant_id: f.id,
          type:       f.tipo,
          quantity:   parseInt(f.qtd, 10),
          reason:     f.motivo || undefined,
        });
      }
      carregarResumo();
      setEditandoProduto(null);
    } catch (e: any) {
      alert(e?.response?.data?.error ?? 'Erro ao registrar movimentos.');
    } finally {
      setSalvandoMov(null);
    }
  }

  function carregarHistorico() {
    setLoadingMov(true);
    api.get('/inventory/movements?limit=50')
      .then(r => setMovimentos(r.data.data.movements))
      .finally(() => setLoadingMov(false));
  }

  // Aplica busca + filtros aos produtos de uma categoria
  function filtrarProdutos(produtos: ProdutoEstoque[]): ProdutoEstoque[] {
    const termo = busca.trim().toLowerCase();
    return produtos.filter(p => {
      if (termo && !p.name.toLowerCase().includes(termo)) return false;
      if (soSemEstoque && !p.sem_estoque) return false;
      if (soBaixo && !p.estoque_baixo) return false;
      return true;
    });
  }

  return (
    <div className="max-w-5xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-semibold text-foreground">Estoque</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Visão geral do estoque por categoria e histórico de movimentações.
        Para alterar preços ou o estoque de um produto, use a tela de <Link href="/admin/products" className="text-muted-foreground hover:text-foreground">Produtos</Link>.
      </p>

      {/* Abas */}
      <div className="mb-6 flex gap-2">
        <button onClick={() => setAba('resumo')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${aba === 'resumo' ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground'}`}>
          Resumo
        </button>
        <button onClick={() => { setAba('historico'); if (movimentos.length === 0) carregarHistorico(); }}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${aba === 'historico' ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground'}`}>
          Histórico de movimentações
        </button>
      </div>

      {/* ── ABA RESUMO ── */}
      {aba === 'resumo' && (loading ? (
        <p className="text-center text-muted-foreground py-20">Carregando...</p>
      ) : (
        <>
          {/* Cartões de totais */}
          {totais && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
              <Tot titulo="Produtos" valor={totais.produtos} />
              <Tot titulo="Peças em estoque" valor={totais.estoque} />
              <Tot titulo="Sem estoque" valor={totais.sem_estoque} cor={totais.sem_estoque > 0 ? 'text-red-500' : undefined} />
              <Tot titulo="Estoque baixo" valor={totais.estoque_baixo} cor={totais.estoque_baixo > 0 ? 'text-amber-500' : undefined} />
            </div>
          )}

          {/* Filtros */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Buscar produto..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="rounded-lg border border-input px-3 py-2 text-sm outline-none focus:border-foreground w-56"
            />
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={soSemEstoque} onChange={e => setSoSemEstoque(e.target.checked)} className="accent-red-500" />
              Sem estoque
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={soBaixo} onChange={e => setSoBaixo(e.target.checked)} className="accent-amber-500" />
              Estoque baixo
            </label>
          </div>

          {/* Categorias expansíveis */}
          <div className="space-y-2">
            {categorias.map(cat => {
              const produtosFiltrados = filtrarProdutos(cat.produtos);
              const aberta = expandida === cat.category_id;
              // Esconde a categoria se há filtro ativo e nenhum produto passa
              const temFiltro = busca.trim() || soSemEstoque || soBaixo;
              if (temFiltro && produtosFiltrados.length === 0) return null;
              return (
                <div key={cat.category_id} className="border border-border bg-card overflow-hidden">
                  <button
                    onClick={() => setExpandida(aberta ? null : cat.category_id)}
                    className="flex w-full items-center justify-between px-5 py-3 hover:bg-secondary transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">{aberta ? '▾' : '▸'}</span>
                      <span className="text-sm font-semibold text-foreground">{cat.category_name}</span>
                      <span className="text-sm text-muted-foreground">{cat.total_produtos} produto(s)</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      {cat.estoque_baixo > 0 && <span className="text-amber-500">{cat.estoque_baixo} baixo</span>}
                      {cat.sem_estoque > 0 && <span className="text-red-500">{cat.sem_estoque} esgotado</span>}
                      <span className="text-muted-foreground">{cat.total_estoque} peças</span>
                    </div>
                  </button>

                  {aberta && (
                    <div className="border-t border-border divide-y divide-border">
                      {produtosFiltrados.map(p => (
                        <div key={p.id} className="flex items-center justify-between px-5 py-2.5">
                          <span className="text-sm text-foreground line-clamp-1">{p.name}</span>
                          <div className="flex items-center gap-3 text-xs">
                            {p.sem_estoque && <span className="rounded bg-red-500/15 text-red-600 dark:text-red-400 px-1.5 py-0.5">esgotado</span>}
                            {p.estoque_baixo && <span className="rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 px-1.5 py-0.5">baixo</span>}
                            <span className="text-muted-foreground">{p.variant_count} tam.</span>
                            <span className="font-semibold text-foreground w-16 text-right">{p.disponivel} disp.</span>
                            <button onClick={() => abrirEditor({ id: p.id, name: p.name })}
                              className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-secondary">
                              Editar estoque
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ))}

      {/* ── ABA HISTÓRICO ── */}
      {aba === 'historico' && (loadingMov ? (
        <p className="text-center text-muted-foreground py-20">Carregando...</p>
      ) : movimentos.length === 0 ? (
        <p className="text-center text-muted-foreground py-20">Nenhuma movimentação registrada ainda.</p>
      ) : (
        <div className="border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Produto</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Qtd</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {movimentos.map(m => {
                const info = MOV_LABEL[m.type] ?? { txt: m.type, cor: 'text-muted-foreground' };
                return (
                  <tr key={m.id} className="hover:bg-secondary">
                    <td className="px-4 py-2.5 text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(m.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-2.5 text-foreground">
                      {m.product_name ?? '—'} <span className="text-xs text-muted-foreground">{m.variant_sku}</span>
                    </td>
                    <td className={`px-4 py-2.5 font-medium ${info.cor}`}>{info.txt}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-foreground">{m.quantity}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{m.reason ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      {/* ── Modal: editar estoque de um produto ── */}
      {editandoProduto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg bg-card p-6 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-1">
              <h2 className="text-base font-semibold text-foreground">Estoque — {editandoProduto.name}</h2>
              <button onClick={() => setEditandoProduto(null)} className="text-muted-foreground hover:text-foreground text-xl leading-none">✕</button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Toda alteração registra um movimento no histórico.</p>

            {carregandoVar ? (
              <p className="text-center text-muted-foreground py-8">Carregando...</p>
            ) : (
              <div className="space-y-3">
                {variantes.map((v: any) => {
                  const f = movForm[v.id] ?? { tipo: 'IN', qtd: '', motivo: '' };
                  const tam = Object.values(v.attributes)[0] ?? v.sku;
                  return (
                    <div key={v.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-foreground">{tam}</span>
                        <span className="text-sm text-muted-foreground">{v.available} disp. {v.reserved > 0 && <span className="text-xs">({v.reserved} reservado)</span>}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <select value={f.tipo}
                          onChange={e => setMovForm(p => ({ ...p, [v.id]: { ...f, tipo: e.target.value } }))}
                          className="rounded-lg border border-input px-2 py-1.5 text-sm outline-none focus:border-foreground">
                          <option value="IN">Entrada</option>
                          <option value="OUT">Saída</option>
                          <option value="ADJUSTMENT">Ajuste (valor exato)</option>
                        </select>
                        <input type="number" min={1} value={f.qtd} placeholder="Qtd"
                          onChange={e => setMovForm(p => ({ ...p, [v.id]: { ...f, qtd: e.target.value } }))}
                          className="w-20 rounded-lg border border-input px-2 py-1.5 text-sm outline-none focus:border-foreground" />
                        <input value={f.motivo} placeholder="Motivo (opcional)"
                          onChange={e => setMovForm(p => ({ ...p, [v.id]: { ...f, motivo: e.target.value } }))}
                          className="flex-1 min-w-[120px] rounded-lg border border-input px-2 py-1.5 text-sm outline-none focus:border-foreground" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Um único botão salva todas as movimentações preenchidas */}
            <div className="mt-4 flex gap-2">
              <button onClick={salvarTodos} disabled={salvandoMov === -1}
                className="flex-1 bg-primary py-2.5 text-[11px] font-bold uppercase tracking-widest text-primary-foreground hover:opacity-80 disabled:opacity-50">
                {salvandoMov === -1 ? 'Salvando...' : 'Salvar alterações de estoque'}
              </button>
              <button onClick={() => setEditandoProduto(null)}
                className="border border-border px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-secondary">
                Cancelar
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
              Preencha a quantidade só nos tamanhos que quer alterar.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Tot({ titulo, valor, cor }: { titulo: string; valor: number; cor?: string }) {
  return (
    <div className="border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground mb-1">{titulo}</p>
      <p className={`text-2xl font-bold ${cor ?? 'text-foreground'}`}>{valor}</p>
    </div>
  );
}
