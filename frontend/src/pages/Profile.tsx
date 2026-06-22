import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

type Address = {
  id: number;
  label: string | null;
  recipient_name: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  is_default: boolean;
};

export function ProfilePage() {
  const { user } = useAuth();

  // Perfil
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [phone, setPhone]         = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved]   = useState(false);

  // Endereços
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading]     = useState(true);

  async function carregar() {
    setLoading(true);
    try {
      const [me, addrs] = await Promise.all([
        api.get('/users/me'),
        api.get('/users/me/addresses'),
      ]);
      const u = me.data.data.user;
      setFirstName(u.first_name ?? '');
      setLastName(u.last_name ?? '');
      setPhone(u.phone ?? '');
      setAddresses(addrs.data.data.addresses);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { carregar(); }, []);

  async function salvarPerfil() {
    setSavingProfile(true);
    try {
      await api.patch('/users/me', { first_name: firstName, last_name: lastName, phone });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (e: any) {
      alert(e?.response?.data?.error ?? 'Erro ao salvar.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function removerEndereco(id: number) {
    if (!confirm('Remover este endereço?')) return;
    try {
      await api.delete(`/users/me/addresses/${id}`);
      setAddresses(prev => prev.filter(a => a.id !== id));
    } catch (e: any) {
      alert(e?.response?.data?.error ?? 'Erro ao remover.');
    }
  }

  if (loading) return <p className="py-20 text-center text-xs uppercase tracking-widest text-muted-foreground">Carregando...</p>;

  const inputCls = "w-full border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground transition";
  const labelCls = "mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-8 font-display text-2xl font-bold uppercase tracking-tight border-b border-border pb-6">Minha conta</h1>

      {/* ── Dados pessoais ── */}
      <div className="mb-6 border border-border bg-card p-5">
        <p className="mb-4 font-display text-sm font-bold uppercase tracking-widest">Dados pessoais</p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Nome</label>
            <input value={firstName} onChange={e => setFirstName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Sobrenome</label>
            <input value={lastName} onChange={e => setLastName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Telefone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input value={user?.email ?? ''} disabled className={`${inputCls} bg-secondary text-muted-foreground`} />
          </div>
        </div>

        <button onClick={salvarPerfil} disabled={savingProfile}
          className={`mt-5 px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest text-primary-foreground transition ${
            profileSaved ? 'bg-success' : 'bg-primary hover:opacity-80 disabled:opacity-50'
          }`}>
          {savingProfile ? 'Salvando...' : profileSaved ? '✓ Salvo' : 'Salvar dados'}
        </button>
      </div>

      {/* ── Endereços ── */}
      <div className="border border-border bg-card p-5">
        <p className="mb-4 font-display text-sm font-bold uppercase tracking-widest">Meus endereços</p>

        {addresses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Você ainda não tem endereços salvos. Eles são adicionados ao finalizar uma compra.
          </p>
        ) : (
          <div className="space-y-3">
            {addresses.map(a => (
              <div key={a.id} className="flex items-start justify-between gap-3 border border-border p-3">
                <div className="text-sm">
                  <div className="flex items-center gap-2">
                    {a.label && <p className="font-display text-xs font-bold uppercase tracking-wide">{a.label}</p>}
                    {a.is_default && <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 uppercase tracking-widest">padrão</span>}
                  </div>
                  <p className="text-foreground mt-1">{a.recipient_name}</p>
                  <p className="text-muted-foreground">{a.street}, {a.number}{a.complement ? ` — ${a.complement}` : ''}</p>
                  <p className="text-muted-foreground">{a.neighborhood}, {a.city} — {a.state}, {a.zip_code}</p>
                </div>
                <button onClick={() => removerEndereco(a.id)}
                  className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-destructive shrink-0">
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
