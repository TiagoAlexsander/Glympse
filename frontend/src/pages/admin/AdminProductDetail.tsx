import { useEffect, useState } from 'react';
import { Link, useRoute } from 'wouter';
import { api } from '@/services/api';
import { formatarReal, ordemTamanho, TAMANHOS_SUGERIDOS } from '@/utils';

type Variant = {
  id: number;
  sku: string;
  price: number;
  is_active: boolean;
  quantity: number;
  reserved: number;
  available: number;
  attributes: Record<string, string>;
};
type Product = {
  id: number;
  name: string;
  slug: string;
  base_price: number;
  compare_price: number | null;
  is_active: boolean;
  is_featured: boolean;
  brand: string | null;
  category_id: number | null;
  variants: Variant[];
  collection_ids: number[];
};
type Collection = { id: number; name: string; is_active: boolean };
type Category   = { id: number; name: string };

// Linha de tamanho na edição (em memória até salvar)
type SizeRow = {
  id: number | null;     // null = tamanho novo (ainda não existe no banco)
  size: string;
  price: string;
  is_active: boolean;
  available: number;     // só leitura
  reserved: number;
  deleted: boolean;      // marcado para remover ao salvar
};

export function AdminProductDetail() {
  const [, params] = useRoute<{ id: string }>('/admin/products/:id');
  const id = params?.id;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo]       = useState(false);

  // Campos do produto
  const [nome, setNome]               = useState('');
  const [basePrice, setBasePrice]     = useState('');
  const [comparePrice, setComparePrice] = useState('');
  const [ativo, setAtivo]             = useState(true);
  const [destaque, setDestaque]       = useState(false);
  const [categoriaId, setCategoriaId] = useState('');

  // Tamanhos (staged)
  const [rows, setRows] = useState<SizeRow[]>([]);
  const [novoTamanho, setNovoTamanho] = useState('');

  // Listas auxiliares
  const [collections, setCollections]   = useState<Collection[]>([]);
  const [categories, setCategories]     = useState<Category[]>([]);
  const [selectedCols, setSelectedCols] = useState<number[]>([]);

  async function carregar() {
    if (!id) return;
    setLoading(true);
    try {
      const [r, rc, rcat] = await Promise.all([
        api.get(`/products/admin/${id}`),
        api.get('/collections/admin/all'),
        api.get('/categories'),
      ]);
      const p = r.data.data.product as Product;
      setProduct(p);
      setNome(p.name);
      setBasePrice(String(p.base_price));
      setComparePrice(p.compare_price != null ? String(p.compare_price) : '');
      setAtivo(p.is_active);
      setDestaque(p.is_featured);
      setCategoriaId(p.category_id != null ? String(p.category_id) : '');
      setCollections(rc.data.data.collections);
      setCategories(rcat.data.data.categories);
      setSelectedCols(p.collection_ids ?? []);
      setRows(p.variants.map(v => ({
        id:        v.id,
        size:      Object.values(v.attributes)[0] ?? v.sku,
        price:     String(v.price),
        is_active: v.is_active,
        available: v.available,
        reserved:  v.reserved,
        deleted:   false,
      })));
      setNovoTamanho('');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { carregar(); }, [id]);

  function atualizarRow(idx: number, campo: keyof SizeRow, valor: any) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [campo]: valor } : r));
  }
  function toggleColecao(cid: number) {
    setSelectedCols(prev => prev.includes(cid) ? prev.filter(x => x !== cid) : [...prev, cid]);
  }

  // Adiciona um tamanho na tabela (apenas em memória — aplica ao salvar)
  function adicionarTamanho(tam: string) {
    const t = tam.trim().toUpperCase();
    if (!t) return;
    // Se já existe (mesmo marcado pra deletar), reativa em vez de duplicar
    const existente = rows.find(r => r.size.toUpperCase() === t);
    if (existente) {
      setRows(prev => prev.map(r => r.size.toUpperCase() === t ? { ...r, deleted: false } : r));
    } else {
      setRows(prev => [...prev, {
        id: null, size: t, price: basePrice || '0', is_active: true, available: 0, reserved: 0, deleted: false,
      }]);
    }
    setNovoTamanho('');
  }

  function removerTamanho(idx: number) {
    setRows(prev => {
      const r = prev[idx];
      // Tamanho novo (não salvo) some direto; existente fica marcado
      if (r.id === null) return prev.filter((_, i) => i !== idx);
      return prev.map((x, i) => i === idx ? { ...x, deleted: !x.deleted } : x);
    });
  }

  // Salva TUDO de uma vez: produto, preços, add/remover tamanhos, coleções
  async function salvarTudo() {
    if (!product) return;
    setSalvando(true);
    try {
      // 1. Dados do produto
      await api.put(`/products/${product.id}`, {
        name:          nome,
        base_price:    parseFloat(basePrice.replace(',', '.')),
        compare_price: comparePrice.trim() ? parseFloat(comparePrice.replace(',', '.')) : null,
        is_active:     ativo,
        is_featured:   destaque,
        category_id:   categoriaId || null,
      });

      // 2. Tamanhos
      for (const r of rows) {
        if (r.deleted && r.id) {
          await api.delete(`/products/admin/variants/${r.id}`);
        } else if (r.id === null && !r.deleted) {
          await api.post(`/products/admin/${product.id}/variants`, {
            size: r.size, price: parseFloat(r.price.replace(',', '.')),
          });
        } else if (r.id && !r.deleted) {
          await api.patch(`/products/admin/variants/${r.id}`, {
            price: parseFloat(r.price.replace(',', '.')), is_active: r.is_active,
          });
        }
      }

      // 3. Coleções
      await api.put(`/products/admin/${product.id}/collections`, { collection_ids: selectedCols });

      setSalvo(true);
      setTimeout(() => setSalvo(false), 2500);
      await carregar();
    } catch (err: any) {
      alert(err?.response?.data?.error ?? 'Erro ao salvar.');
    } finally {
      setSalvando(false);
    }
  }

  if (loading)  return <p className="py-20 text-center text-muted-foreground">Carregando...</p>;
  if (!product) return <p className="py-20 text-center text-muted-foreground">Produto não encontrado.</p>;

  const bp = parseFloat(basePrice.replace(',', '.')) || 0;
  const cp = parseFloat(comparePrice.replace(',', '.')) || 0;
  const descontoPct = cp > bp ? Math.round((1 - bp / cp) * 100) : 0;

  const rowsOrdenadas = [...rows]
    .map((r, idx) => ({ r, idx }))
    .sort((a, b) => ordemTamanho(a.r.size) - ordemTamanho(b.r.size));

  // Tamanhos sugeridos que ainda não estão na tabela (ignorando os marcados pra deletar)
  const presentes = rows.filter(r => !r.deleted).map(r => r.size.toUpperCase());
  const sugestoes = TAMANHOS_SUGERIDOS.filter(s => !presentes.includes(s));

  return (
    <div className="max-w-3xl px-4 py-8">
      <Link href="/admin/products" className="text-xs text-muted-foreground hover:underline">← Catálogo</Link>
      <div className="mt-1 mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-foreground">{product.name}</h1>
        <Link href={`/products/${product.slug}`} className="text-xs text-muted-foreground hover:text-foreground">ver na loja →</Link>
      </div>

      {/* ── Dados do produto ── */}
      <div className="mb-6 border border-border bg-card p-5">
        <p className="mb-4 text-sm font-semibold text-foreground">Dados do produto</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
            <input value={nome} onChange={e => setNome(e.target.value)}
              className="w-full rounded-lg border border-input px-3 py-2 text-sm outline-none focus:border-foreground" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Preço de venda (R$)</label>
              <input value={basePrice} inputMode="decimal"
                onChange={e => setBasePrice(e.target.value.replace(/[^\d.,]/g, ''))}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm outline-none focus:border-foreground" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Preço "de" / sem desconto (R$)</label>
              <input value={comparePrice} inputMode="decimal" placeholder="vazio = sem desconto"
                onChange={e => setComparePrice(e.target.value.replace(/[^\d.,]/g, ''))}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm outline-none focus:border-foreground" />
            </div>
          </div>

          {descontoPct > 0 ? (
            <p className="text-xs text-success">
              ✓ A loja mostrará <strong>−{descontoPct}%</strong>: de <span className="line-through">{formatarReal(cp)}</span> por <strong>{formatarReal(bp)}</strong>
            </p>
          ) : comparePrice.trim() && cp <= bp ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">⚠ O preço "de" precisa ser MAIOR que o de venda para gerar desconto.</p>
          ) : (
            <p className="text-xs text-muted-foreground">Sem desconto. Preencha o preço "de" para criar uma promoção.</p>
          )}

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Categoria</label>
            <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)}
              className="w-full rounded-lg border border-input px-3 py-2 text-sm outline-none focus:border-foreground">
              <option value="">Sem categoria</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={ativo} onChange={e => setAtivo(e.target.checked)} className="accent-foreground h-4 w-4" />
              <span><strong>Ativo</strong> — o produto aparece na loja e pode ser comprado</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={destaque} onChange={e => setDestaque(e.target.checked)} className="accent-foreground h-4 w-4" />
              <span><strong>Destaque</strong> — ganha o selo "Destaque" na vitrine (marketing, não afeta estoque)</span>
            </label>
          </div>
        </div>
      </div>

      {/* ── Coleções ── */}
      <div className="mb-6 border border-border bg-card p-5">
        <p className="mb-1 text-sm font-semibold text-foreground">Coleções</p>
        <p className="mb-3 text-xs text-muted-foreground">Marque as coleções de que este produto faz parte (pode estar em várias).</p>
        {collections.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma coleção criada ainda.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {collections.map(c => {
              const marcada = selectedCols.includes(c.id);
              return (
                <button key={c.id} onClick={() => toggleColecao(c.id)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    marcada ? 'border-foreground bg-primary text-primary-foreground' : 'border-input text-muted-foreground hover:border-foreground'
                  }`}>
                  {marcada ? '✓ ' : ''}{c.name}{!c.is_active && <span className="opacity-60"> (oculta)</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Tamanhos e preços (staged) ── */}
      <div className="border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Tamanhos e preços</p>
          <p className="text-xs text-muted-foreground">
            Clique num tamanho para adicioná-lo. As mudanças só são aplicadas ao clicar em <strong>Salvar</strong>.
            O estoque é editado na aba <Link href="/admin/inventory" className="text-muted-foreground hover:text-foreground">Estoque</Link>.
          </p>
        </div>

        {/* Botões para adicionar tamanho */}
        <div className="px-5 py-3 border-b border-border flex flex-wrap items-center gap-2">
          {sugestoes.map(s => (
            <button key={s} onClick={() => adicionarTamanho(s)}
              className="rounded-lg border border-input px-3 py-1.5 text-sm text-muted-foreground hover:border-foreground hover:bg-secondary transition">
              + {s}
            </button>
          ))}
          <input
            value={novoTamanho}
            onChange={e => setNovoTamanho(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === 'Enter') adicionarTamanho(novoTamanho); }}
            placeholder="outro"
            className="w-20 rounded-lg border border-input px-2 py-1.5 text-sm outline-none focus:border-foreground"
          />
          {novoTamanho.trim() && (
            <button onClick={() => adicionarTamanho(novoTamanho)}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-80">
              Adicionar
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary border-b border-border">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Tamanho</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Preço (R$)</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Estoque</th>
                <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Ativo</th>
                <th className="px-4 py-2.5 text-center font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rowsOrdenadas.map(({ r, idx }) => (
                <tr key={r.id ?? `novo-${r.size}`} className={`hover:bg-secondary ${r.deleted ? 'opacity-40' : ''}`}>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-foreground">{r.size}</span>
                    {r.id === null && <span className="ml-2 text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-1.5 rounded">novo</span>}
                    {r.deleted && <span className="ml-2 text-[10px] bg-red-500/15 text-red-600 dark:text-red-400 px-1.5 rounded">será removido</span>}
                  </td>
                  <td className="px-4 py-3">
                    <input type="text" inputMode="decimal" value={r.price} disabled={r.deleted}
                      onChange={ev => atualizarRow(idx, 'price', ev.target.value.replace(/[^\d.,]/g, ''))}
                      className="w-24 rounded-lg border border-input px-2 py-1.5 text-sm outline-none focus:border-foreground disabled:bg-secondary" />
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {r.id === null ? <span className="text-xs text-muted-foreground">definir em Estoque</span> : <>{r.available} disp.{r.reserved > 0 && <span className="text-xs text-muted-foreground"> ({r.reserved} res.)</span>}</>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input type="checkbox" checked={r.is_active} disabled={r.deleted}
                      onChange={ev => atualizarRow(idx, 'is_active', ev.target.checked)}
                      className="accent-foreground h-4 w-4" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => removerTamanho(idx)}
                      className="text-xs text-muted-foreground hover:text-red-500">
                      {r.deleted ? 'desfazer' : 'remover'}
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground text-sm">Nenhum tamanho. Adicione acima.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Botão único de salvar ── */}
      <div className="mt-5 flex items-center gap-3">
        <button onClick={salvarTudo} disabled={salvando}
          className={`rounded-xl px-6 py-2.5 text-sm font-semibold text-primary-foreground transition ${
            salvo ? 'bg-success' : 'bg-primary hover:opacity-80 disabled:opacity-50'
          }`}>
          {salvando ? 'Salvando...' : salvo ? '✓ Tudo salvo!' : 'Salvar todas as alterações'}
        </button>
        <p className="text-xs text-muted-foreground">Aplica de uma vez: dados, preços, tamanhos e coleções.</p>
      </div>
    </div>
  );
}
