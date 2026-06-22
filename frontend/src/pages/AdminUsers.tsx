import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

type User = {
  id: string;
  first_name: string;
  last_name: string | null;
  display_name: string | null;
  username: string | null;
  role: 'ADMIN' | 'USER';
  is_active: boolean;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export function AdminUsersPage() {
  const { user: me, logout } = useAuth();

  const [users, setUsers]           = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage]             = useState(1);

  async function fetchUsers() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '10');
      if (search)     params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);

      const res = await api.get(`/admin/users?${params.toString()}`);
      setUsers(res.data.data.users);
      setPagination(res.data.pagination);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Erro ao buscar usuários.');
    } finally {
      setLoading(false);
    }
  }

  // Busca sempre que page, search ou roleFilter mudar
  useEffect(() => { fetchUsers(); }, [page, search, roleFilter]);

  // Reseta para página 1 ao filtrar
  function handleSearch(val: string) { setSearch(val); setPage(1); }
  function handleRole(val: string)   { setRoleFilter(val); setPage(1); }

  async function toggleStatus(userId: string, currentStatus: boolean) {
    try {
      await api.patch(`/admin/users/${userId}/status`, { is_active: !currentStatus });
      fetchUsers();
    } catch (err: any) {
      alert(err?.response?.data?.error ?? 'Erro ao alterar status.');
    }
  }

  async function toggleRole(userId: string, currentRole: 'ADMIN' | 'USER') {
    const novaRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    if (!confirm(`Mudar role para ${novaRole}?`)) return;
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: novaRole });
      fetchUsers();
    } catch (err: any) {
      alert(err?.response?.data?.error ?? 'Erro ao alterar role.');
    }
  }

  async function handleDelete(userId: string, name: string) {
    if (!confirm(`Deletar "${name}"? Essa ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      fetchUsers();
    } catch (err: any) {
      alert(err?.response?.data?.error ?? 'Erro ao deletar usuário.');
    }
  }

  return (
    <div className="min-h-screen bg-secondary">

      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Glympse Admin</p>
            <h1 className="text-lg font-semibold text-foreground">Usuários</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Olá, <strong>{me?.first_name}</strong>
            </span>
            <button
              onClick={logout}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">

        {/* Filtros */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="text"
            placeholder="Buscar por nome ou username..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="w-full rounded-lg border border-input px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 sm:max-w-xs"
          />
          <select
            value={roleFilter}
            onChange={e => handleRole(e.target.value)}
            className="rounded-lg border border-input px-3 py-2 text-sm outline-none focus:border-orange-400"
          >
            <option value="">Todos os roles</option>
            <option value="ADMIN">Admin</option>
            <option value="USER">User</option>
          </select>
        </div>

        {/* Erro */}
        {error && (
          <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
        )}

        {/* Tabela */}
        <div className="overflow-hidden border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Usuário</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Criado em</th>
                <th className="px-4 py-3 text-left">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    Carregando...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : users.map(u => (
                <tr key={u.id} className="hover:bg-secondary">

                  {/* Nome + username */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
                        {u.first_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {u.first_name} {u.last_name}
                        </p>
                        {u.username && (
                          <p className="text-xs text-muted-foreground">@{u.username}</p>
                        )}
                        <p className="text-xs text-muted-foreground font-mono">{u.id.slice(0, 8)}…</p>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.role === 'ADMIN'
                        ? 'bg-violet-500/15 text-violet-700 dark:text-violet-400'
                        : 'bg-secondary text-muted-foreground'
                    }`}>
                      {u.role}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.is_active
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                        : 'bg-red-500/15 text-red-600 dark:text-red-400'
                    }`}>
                      {u.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>

                  {/* Data */}
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString('pt-BR')}
                  </td>

                  {/* Ações */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleRole(u.id, u.role)}
                        title="Alternar role"
                        className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-secondary"
                      >
                        {u.role === 'ADMIN' ? '→ User' : '→ Admin'}
                      </button>
                      <button
                        onClick={() => toggleStatus(u.id, u.is_active)}
                        title="Alternar status"
                        className={`rounded px-2 py-1 text-xs hover:opacity-80 ${
                          u.is_active
                            ? 'text-destructive hover:bg-destructive/10'
                            : 'text-success hover:bg-success/10'
                        }`}
                      >
                        {u.is_active ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        onClick={() => handleDelete(u.id, `${u.first_name} ${u.last_name}`)}
                        title="Deletar usuário"
                        className="rounded px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                      >
                        Deletar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {pagination && pagination.pages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <p>{pagination.total} usuários no total</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-border px-3 py-1.5 hover:bg-secondary disabled:opacity-40"
              >
                Anterior
              </button>
              <span>Página {page} de {pagination.pages}</span>
              <button
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
                className="rounded-lg border border-border px-3 py-1.5 hover:bg-secondary disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
