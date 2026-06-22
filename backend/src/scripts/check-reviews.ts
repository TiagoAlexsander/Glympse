/**
 * Detalha as reviews e checa por que podem não aparecer.
 * Rodar: npx ts-node src/scripts/check-reviews.ts
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
    .from('reviews')
    .select('id, product_id, user_id, rating, is_approved, verified_purchase, title, owner_reply, created_at')
    .order('id', { ascending: false });

  if (error) { console.error('Erro:', error.message); return; }

  console.log('\n⭐ Reviews no banco:\n');
  for (const r of data ?? []) {
    // Pega nome/slug do produto
    const { data: prod } = await s.from('products').select('name, slug').eq('id', r.product_id).maybeSingle();
    console.log(`  #${r.id}  produto ${r.product_id} (${prod?.slug ?? '?'})`);
    console.log(`      rating: ${r.rating}★  |  aprovada: ${r.is_approved}  |  verificada: ${r.verified_purchase}`);
    console.log(`      título: ${r.title ?? '(sem)'}  |  resposta loja: ${r.owner_reply ? 'SIM' : 'não'}`);
    console.log(`      produto ativo? slug = ${prod?.slug}`);
    console.log('');
  }
}

main();
