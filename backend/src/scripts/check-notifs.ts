/**
 * Lista as últimas notificações criadas — debug de testes.
 * Rodar: npx ts-node src/scripts/check-notifs.ts
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
  const { data, error } = await s
    .from('notifications')
    .select('id, user_id, type, title, is_read, created_at')
    .order('id', { ascending: false })
    .limit(15);

  if (error) { console.error('Erro:', error.message); return; }

  console.log('\n🔔 Últimas notificações:\n');
  for (const n of data ?? []) {
    console.log(`  #${n.id}  [${n.type}]  ${n.title}  |  lida: ${n.is_read}  |  ${n.created_at?.slice(0, 16)}`);
  }
  console.log('');
}

main();
