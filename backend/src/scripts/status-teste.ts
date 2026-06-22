/**
 * Mostra o estado atual de pedidos, devoluções, envios e reviews — útil durante testes.
 * Rodar: npx ts-node src/scripts/status-teste.ts
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
  const { data: orders } = await s
    .from('orders')
    .select('id, order_number, status, payment_status, total, created_at')
    .order('id', { ascending: false })
    .limit(10);

  console.log('\n📦 PEDIDOS (10 mais recentes):');
  for (const o of orders ?? []) {
    console.log(`  #${o.id}  ${o.order_number}  |  ${o.status} / pag: ${o.payment_status}  |  R$ ${o.total}`);
  }

  const { data: returns } = await s
    .from('returns')
    .select('id, order_id, status, reason, refund_amount')
    .order('id', { ascending: false })
    .limit(10);

  console.log('\n↩  DEVOLUÇÕES:');
  if (!returns?.length) console.log('  (nenhuma)');
  for (const r of returns ?? []) {
    console.log(`  #${r.id}  pedido ${r.order_id}  |  ${r.status}  |  motivo: ${r.reason}${r.refund_amount ? `  |  reembolso: R$ ${r.refund_amount}` : ''}`);
  }

  const { data: shipments } = await s
    .from('shipments')
    .select('id, order_id, status, tracking_code, carrier')
    .order('id', { ascending: false })
    .limit(10);

  console.log('\n🚚 ENVIOS:');
  if (!shipments?.length) console.log('  (nenhum)');
  for (const sh of shipments ?? []) {
    console.log(`  #${sh.id}  pedido ${sh.order_id}  |  ${sh.status}  |  ${sh.carrier} ${sh.tracking_code}`);
  }

  const { data: reviews } = await s
    .from('reviews')
    .select('id, product_id, rating, is_approved, title')
    .order('id', { ascending: false })
    .limit(10);

  console.log('\n⭐ REVIEWS:');
  if (!reviews?.length) console.log('  (nenhuma)');
  for (const r of reviews ?? []) {
    console.log(`  #${r.id}  produto ${r.product_id}  |  ${r.rating}★  |  ${r.is_approved ? 'APROVADA' : 'PENDENTE'}  |  ${r.title ?? '(sem título)'}`);
  }
  console.log('');
}

main();
