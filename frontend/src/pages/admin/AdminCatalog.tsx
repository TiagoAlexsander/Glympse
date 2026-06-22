import { useState } from 'react';
import { AdminProducts } from './AdminProducts';
import { AdminCategories } from './AdminCategories';
import { AdminCollections } from './AdminCollections';

type Aba = 'produtos' | 'categorias' | 'colecoes';

const ABAS: { id: Aba; label: string; icon: string }[] = [
  { id: 'produtos',   label: 'Produtos',   icon: '👕' },
  { id: 'categorias', label: 'Categorias', icon: '🏷️' },
  { id: 'colecoes',   label: 'Coleções',   icon: '🗂️' },
];

// Página de Catálogo: reúne Produtos, Categorias e Coleções em abas
export function AdminCatalog() {
  const [aba, setAba] = useState<Aba>('produtos');

  return (
    <div className="max-w-5xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-semibold text-foreground">Catálogo</h1>
      <p className="mb-5 text-sm text-muted-foreground">Gerencie produtos, categorias e coleções da loja.</p>

      {/* Abas */}
      <div className="mb-6 flex gap-2 border-b border-border">
        {ABAS.map(a => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
              aba === a.id
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>{a.icon}</span>{a.label}
          </button>
        ))}
      </div>

      {/* Conteúdo da aba */}
      {aba === 'produtos'   && <AdminProducts />}
      {aba === 'categorias' && <AdminCategories />}
      {aba === 'colecoes'   && <AdminCollections />}
    </div>
  );
}
