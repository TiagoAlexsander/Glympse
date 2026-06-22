import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api';

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function setApiToken(token: string | null): void {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete api.defaults.headers.common.Authorization;
}

// Sessão expirada (token do Supabase dura 1h):
// limpa o login e manda para a tela de entrar, em vez de falhar silenciosamente
api.interceptors.response.use(
  response => response,
  error => {
    const status = error?.response?.status;
    const temToken = !!localStorage.getItem('glympse_token');

    // Só desloga se o usuário ACHAVA que estava logado (tinha token salvo)
    if (status === 401 && temToken) {
      localStorage.removeItem('glympse_token');
      delete api.defaults.headers.common.Authorization;
      alert('Sua sessão expirou. Entre novamente.');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);