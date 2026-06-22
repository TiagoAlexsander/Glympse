import { useEffect, useState } from 'react';
import { api } from '@/services/api';

type Category = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
};

function gerarSlug(nome: string): string {
  return nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Painel de Categorias (usado dentro da página Catálogo)
export function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [nome, setNome]         = useState('');
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setLoading(true);
    try {
      const r = await api.get('/categories');
      setCategories(r.data.data.categories);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { carregar(); }, []);

  async function criar() {
    if (!nome.trim()) { alert('Informe o nome da categoria.'); return; }
    setSalvando(true);
    try {
      await api.post('/categories', { name: nome, slug: gerarSlug(nome) + '-' + Date.now().toString(36) });
      setNome(''); setShowForm(false);
      await carregar();
    } catch (e: any) {
      alert(e?.response?.data?.error ?? 'Erro ao criar categoria.');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(c: Category) {
    if (!confirm(`Excluir a categoria "${c.name}"?\n\nEla some da loja, mas os produtos NÃO são apagados — apenas ficam sem categoria até você atribuir outra.`)) return;
    try {
      await api.delete(`/categories/${c.id}`);
      await carregar();
    } catch (e: any) {
      alert(e?.response?.data?.error ?? 'Erro ao excluir categoria.');
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Organize os produtos por tipo (ex: Camisetas, Calças).</p>
        <button onClick={() => setShowForm(v => !v)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-80">
          {showForm ? 'Cancelar' : '+ Nova categoria'}
        </button>
      </div>

      {showForm && (
        <div className="mb-4 border border-border bg-card p-4 flex gap-2">
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome da categoria"
            onKeyDown={e => { if (e.key === 'Enter') criar(); }}
            className="flex-1 rounded-lg border border-input px-3 py-2 text-sm outline-none focus:border-foreground" />
          <button onClick={criar} disabled={salvando}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-80 disabled:opacity-50">
            {salvando ? '...' : 'Criar'}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-center text-muted-foreground py-12">Carregando...</p>
      ) : (
        <div className="border border-border bg-card divide-y divide-border">
          {categories.map(c => (
            <div key={c.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{c.name}</p>
                {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground font-mono hidden sm:block">{c.slug}</span>
                <button onClick={() => excluir(c)}
                  className="rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10">
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
