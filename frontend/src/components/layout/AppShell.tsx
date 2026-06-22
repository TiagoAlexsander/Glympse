import type { ReactNode } from 'react';
import { useMobile } from '@/hooks/use-mobile';
import { cn } from '@/utils';

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const isMobile = useMobile();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.18),_transparent_32%),linear-gradient(180deg,_#fffaf3_0%,_#f3eadb_100%)] text-stone-900">
      <header className="border-b border-stone-200/80 bg-white/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-stone-500">Glympse</p>
            <h1 className="mt-1 text-lg font-semibold tracking-tight text-stone-950 sm:text-xl">
              {isMobile ? 'Glympse' : 'Glympse Commerce'}
            </h1>
          </div>

          <div className={cn('hidden items-center gap-3 text-sm text-stone-600 sm:flex')}>
            <span>React + TypeScript</span>
            <span className="h-1 w-1 rounded-full bg-stone-300" />
            <span>Vite + Tailwind</span>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-stone-200/80 bg-white/60">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>Estrutura inicial pronta para o monorepo do Glympse.</p>
          <p>Frontend consumindo a API em {apiBaseLabel()}</p>
        </div>
      </footer>
    </div>
  );
}

function apiBaseLabel(): string {
  return import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api';
}