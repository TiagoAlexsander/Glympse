import { useState } from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';

export function LoginPage() {
  const { login } = useAuth();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground transition";
  const labelCls = "mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground";

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="font-display text-2xl font-bold uppercase tracking-tight">Entrar</h1>
          <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">Acesse sua conta Glympse</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="seu@email.com" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="••••••••" className={inputCls} />
          </div>

          {error && (
            <p className="border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-primary py-3 text-[11px] font-bold uppercase tracking-widest text-primary-foreground transition hover:opacity-80 disabled:opacity-50">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="mt-8 text-center text-xs uppercase tracking-widest text-muted-foreground">
          Não tem conta?{' '}
          <Link href="/register" className="font-bold text-foreground border-b border-foreground pb-0.5 hover:opacity-70">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
