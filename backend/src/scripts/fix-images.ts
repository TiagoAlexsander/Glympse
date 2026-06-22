/**
 * Corrige todas as imagens de produtos [TESTE] para usar picsum.photos
 * que é 100% gratuito e sem necessidade de API key.
 *
 * Rodar: npx ts-node src/scripts/fix-images.ts
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  console.log('\n🖼  Corrigindo imagens para picsum.photos...\n');

  // Busca todos os produtos de teste com suas imagens
  const { data: produtos, error } = await supabase
    .from('products')
    .select('id, slug, product_images(id, sort_order, is_primary)')
    .ilike('name', '%[TESTE]%');

  if (error || !produtos) {
    console.error('Erro ao buscar produtos:', error?.message);
    return;
  }

  console.log(`  Encontrados ${produtos.length} produto(s) de teste`);

  let atualizadas = 0;
  for (const prod of produtos) {
    const imgs = (prod.product_images as any[]);
    for (const img of imgs) {
      // Usa o slug do produto + ordem como seed — sempre a mesma imagem por produto
      const seed = img.sort_order === 1
        ? prod.slug                // imagem principal
        : `${prod.slug}-detail`;   // imagem de detalhe

      const novaUrl = `https://picsum.photos/seed/${seed}/800/1000`;

      await supabase
        .from('product_images')
        .update({ url: novaUrl })
        .eq('id', img.id);

      atualizadas++;
    }
  }

  // Corrige também os produtos do seed original (seed.ts)
  const { data: prodsOriginal } = await supabase
    .from('products')
    .select('id, slug, product_images(id, sort_order)')
    .ilike('name', '%[TESTE]%');

  console.log(`\n✅ ${atualizadas} imagens atualizadas para picsum.photos`);
  console.log('   Recarregue o frontend para ver as novas imagens.\n');
}

main().catch(console.error);
