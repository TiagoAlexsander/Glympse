/**
 * Seed de métodos de frete para teste
 * Rodar: npx ts-node src/scripts/seed-shipping.ts
 */
import 'dotenv/config';
import { supabase } from '../config/supabase';
import { Database } from '../types/database';

type ShippingInsert = Database['public']['Tables']['shipping_methods']['Insert'];

async function seedShipping() {
  console.log('🚚 Inserindo métodos de frete...');

  // Limpa métodos existentes para evitar duplicatas
  await supabase.from('shipping_methods').delete().neq('id', 0);

  const metodos: ShippingInsert[] = [
    {
      name:               'PAC',
      type:               'PAC' as const,
      description:        'Correios PAC — entrega em todo o Brasil',
      price:              18.90,
      free_above:         299.00,
      estimated_days_min: 7,
      estimated_days_max: 15,
      is_active:          true,
    },
    {
      name:               'SEDEX',
      type:               'SEDEX' as const,
      description:        'Correios SEDEX — entrega expressa',
      price:              32.50,
      free_above:         null,
      estimated_days_min: 1,
      estimated_days_max: 3,
      is_active:          true,
    },
    {
      name:               'Motoboy',
      type:               'MOTOBOY' as const,
      description:        'Entrega por motoboy — apenas região metropolitana de SP',
      price:              12.00,
      free_above:         150.00,
      estimated_days_min: 0,
      estimated_days_max: 1,
      is_active:          true,
    },
    {
      name:               'Retirada na loja',
      type:               'STORE_PICKUP' as const,
      description:        'Retire gratuitamente em nossa loja — Rua das Flores, 123, SP',
      price:              0,
      free_above:         null,
      estimated_days_min: 1,
      estimated_days_max: 2,
      is_active:          true,
    },
  ];

  const { data, error } = await supabase.from('shipping_methods').insert(metodos).select('id, name, price');

  if (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }

  console.log('✅ Métodos de frete criados:');
  data?.forEach(m => console.log(`   - ${m.name} (R$ ${m.price})`));
  process.exit(0);
}

seedShipping();
