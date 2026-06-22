/**
 * Seed de cupons de teste.
 * Rodar: npx ts-node src/scripts/seed-coupons.ts
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

type CouponInsert = Database['public']['Tables']['coupons']['Insert'];

const CUPONS: CouponInsert[] = [
  {
    code: 'BEMVINDO10',
    description: '10% de desconto para novos clientes',
    type: 'PERCENTAGE',
    value: 10,
    min_order_amount: null,
    max_discount_amount: null,
    max_uses: null,
    is_active: true,
  },
  {
    code: 'GLYMPSE50',
    description: 'R$ 50 de desconto em compras acima de R$ 300',
    type: 'FIXED_AMOUNT',
    value: 50,
    min_order_amount: 300,
    max_discount_amount: null,
    max_uses: null,
    is_active: true,
  },
  {
    code: 'MEGA25',
    description: '25% off (limitado a R$ 80 de desconto)',
    type: 'PERCENTAGE',
    value: 25,
    min_order_amount: null,
    max_discount_amount: 80,
    max_uses: 100,
    is_active: true,
  },
];

async function main() {
  console.log('\n🎟  Criando cupons de teste...\n');

  for (const cupom of CUPONS) {
    // Não duplica — atualiza se já existir
    const { data: existente } = await supabase
      .from('coupons')
      .select('id')
      .eq('code', cupom.code)
      .maybeSingle();

    if (existente) {
      await supabase.from('coupons').update(cupom).eq('id', existente.id);
      console.log(`  ↻ ${cupom.code} atualizado`);
    } else {
      const { error } = await supabase.from('coupons').insert(cupom);
      if (error) console.log(`  ✗ ${cupom.code}: ${error.message}`);
      else       console.log(`  ✓ ${cupom.code} criado`);
    }
  }

  console.log('\n✅ Cupons prontos:');
  console.log('   BEMVINDO10  → 10% off (qualquer valor)');
  console.log('   GLYMPSE50   → R$ 50 off acima de R$ 300');
  console.log('   MEGA25      → 25% off (máx. R$ 80)\n');
}

main().catch(console.error);
