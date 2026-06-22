/**
 * Promove um usuário a ADMIN pelo email.
 * Rodar: npx ts-node src/scripts/make-admin.ts email@exemplo.com
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
  const email = process.argv[2];
  if (!email) {
    console.error('Uso: npx ts-node src/scripts/make-admin.ts email@exemplo.com');
    return;
  }

  const { data: authData, error } = await s.auth.admin.listUsers();
  if (error || !authData) {
    console.error('Erro:', error?.message);
    return;
  }

  const user = authData.users.find((u: any) => u.email === email);
  if (!user) {
    console.error(`Usuário ${email} não encontrado.`);
    return;
  }

  const { error: updError } = await s.from('users').update({ role: 'ADMIN' }).eq('id', user.id);
  if (updError) {
    console.error('Erro ao atualizar:', updError.message);
    return;
  }

  console.log(`✅ ${email} agora é ADMIN.`);
}

main();
