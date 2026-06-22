/**
 * Limpa TODO o catálogo e os dados transacionais de teste (clean slate).
 * Apaga: pedidos, pagamentos, envios, devoluções, carrinhos, wishlists, reviews,
 * estoque/movimentos, variantes, imagens, produtos, coleções e categorias.
 * NÃO apaga usuários nem cupons.
 *
 * Rodar: npx ts-node src/scripts/reset-loja.ts --confirm
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Apaga todas as linhas de uma tabela (PK inteira)
async function limpar(tabela: string) {
  const { error } = await (supabase.from(tabela as any).delete() as any).gte('id', 0);
  if (error) console.log(`  ⚠ ${tabela}: ${error.message}`);
  else       console.log(`  ✓ ${tabela}`);
}

async function main() {
  if (!process.argv.includes('--confirm')) {
    console.log('\n⚠️  Isso vai APAGAR todo o catálogo e os pedidos/carrinhos/reviews de teste.');
    console.log('   Para confirmar, rode:  npx ts-node src/scripts/reset-loja.ts --confirm\n');
    return;
  }

  console.log('\n🧹 Limpando a loja (ordem segura por dependências)...\n');

  // Filhos primeiro, pais depois (respeitando as FKs)
  await limpar('coupon_usages');
  await limpar('order_status_history');
  await limpar('return_items');
  await limpar('returns');
  await limpar('order_items');
  await limpar('payments');
  await limpar('shipments');
  await limpar('orders');
  await limpar('cart_items');
  await limpar('carts');
  await limpar('wishlist_items');
  await limpar('wishlists');
  await limpar('review_images');
  await limpar('reviews');
  await limpar('inventory_movements');
  await limpar('inventory');
  await limpar('product_variant_attributes');
  await limpar('product_variants');
  await limpar('collection_products');
  await limpar('product_images');
  await limpar('products');
  await limpar('collections');
  await limpar('categories');

  console.log('\n✅ Loja limpa. Agora rode o seed:  npx ts-node src/scripts/seed-loja.ts\n');
}

main().catch(console.error);
