/**
 * Lista os usuários cadastrados (email, role e data de criação).
 * Rodar: npx ts-node src/scripts/list-users.ts
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const s = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const { data, error } = await s.auth.admin.listUsers();
  if (error) { console.error('Erro:', error.message); return; }

  const { data: profiles } = await s.from('users').select('id, role, first_name');

  console.log('\nUsuários cadastrados:\n');
  for (const u of data.users) {
    const perfil = profiles?.find(p => p.id === u.id);
    console.log(`  ${u.email}  |  role: ${perfil?.role ?? '?'}  |  nome: ${perfil?.first_name ?? '?'}  |  criado: ${u.created_at?.slice(0, 10)}`);
  }
  console.log('');
}

main();
