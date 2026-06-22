import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, setApiToken } from '@/services/api';

// Tipo do usuário logado
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  first_name: string;
  last_name: string | null;
  role: 'ADMIN' | 'USER';
  is_active: boolean;
  avatar_url: string | null;
};

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (first_name: string, last_name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]     = useState<AuthUser | null>(null);
  const [token, setToken]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Ao montar, verifica se há sessão salva no localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('glympse_token');
    if (savedToken) {
      setApiToken(savedToken);
      setToken(savedToken);
      // Busca dados atualizados do usuário
      api.get('/auth/me', { baseURL: 'http://localhost:3333' })
        .then(res => setUser(res.data.data.user))
        .catch(() => {
          // Token expirado ou inválido — limpa sessão
          localStorage.removeItem('glympse_token');
          setApiToken(null);
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post('/auth/login', { email, password }, { baseURL: 'http://localhost:3333' });
    const { access_token, user: loggedUser } = res.data.data;

    localStorage.setItem('glympse_token', access_token);
    setApiToken(access_token);
    setToken(access_token);

    // Limpa filtros de sessão anterior
    ['glympse_filter_search','glympse_filter_category','glympse_filter_sort',
     'glympse_filter_minPrice','glympse_filter_maxPrice'].forEach(k => sessionStorage.removeItem(k));

    // Busca perfil completo da tabela public.users
    const meRes = await api.get('/auth/me', { baseURL: 'http://localhost:3333' });
    setUser(meRes.data.data.user);
  }

  async function register(first_name: string, last_name: string, email: string, password: string) {
    await api.post('/auth/register', { first_name, last_name, email, password }, { baseURL: 'http://localhost:3333' });
    // Após registrar, faz login automaticamente
    await login(email, password);
  }

  async function logout() {
    try {
      await api.post('/auth/logout', {}, { baseURL: 'http://localhost:3333' });
    } finally {
      localStorage.removeItem('glympse_token');
      setApiToken(null);
      setToken(null);
      setUser(null);
      // Limpa filtros ao sair
      ['glympse_filter_search','glympse_filter_category','glympse_filter_sort',
       'glympse_filter_minPrice','glympse_filter_maxPrice'].forEach(k => sessionStorage.removeItem(k));
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook para usar o contexto facilmente
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
