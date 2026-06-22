import { useState } from 'react';
import { useLocation } from 'wouter';

// Busca global da navbar — leva os resultados para a listagem /produtos?q=...
export function SearchBar() {
  const [, navigate] = useLocation();
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo]   = useState('');

  function submeter(e: React.FormEvent) {
    e.preventDefault();
    const q = termo.trim();
    navigate(q ? `/produtos?q=${encodeURIComponent(q)}` : '/produtos');
    setAberto(false);
  }

  return (
    <form onSubmit={submeter} className="flex items-center">
      {/* Ícone lupa (abre o campo no mobile / sempre visível no desktop) */}
      <button
        type="button"
        onClick={() => setAberto(v => !v)}
        aria-label="Buscar"
        className="flex h-8 w-8 items-center justify-center text-foreground/70 hover:text-foreground transition sm:pointer-events-none"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      </button>
      <input
        type="text"
        value={termo}
        onChange={e => setTermo(e.target.value)}
        placeholder="BUSCAR"
        className={`border-b border-border bg-transparent text-xs uppercase tracking-widest outline-none transition-all duration-300 focus:border-foreground placeholder:text-muted-foreground ${
          aberto ? 'w-32 opacity-100 px-1' : 'w-0 opacity-0 px-0'
        } sm:w-32 sm:opacity-100 sm:px-1`}
      />
    </form>
  );
}
