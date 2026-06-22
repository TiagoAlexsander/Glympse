import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

// Lê o tema inicial: localStorage > preferência do sistema > light
function temaInicial(): Theme {
  if (typeof window === 'undefined') return 'light';
  const salvo = localStorage.getItem('glympse_theme') as Theme | null;
  if (salvo === 'light' || salvo === 'dark') return salvo;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(temaInicial);

  // Aplica/remove a classe .dark no <html> e persiste
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('glympse_theme', theme);
  }, [theme]);

  function setTheme(t: Theme) { setThemeState(t); }
  function toggleTheme() { setThemeState(prev => (prev === 'dark' ? 'light' : 'dark')); }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  return ctx;
}
