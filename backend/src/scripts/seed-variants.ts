/**
 * Adiciona variantes (tamanhos) aos produtos de teste.
 * Rodar: npx ts-node src/scripts/seed-variants.ts
 * Limpar: npx ts-node src/scripts/seed-variants.ts --clean
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const LIMPAR = process.argv.includes('--clean');

async function limpar() {
  console.log('\n🧹 Limpando variantes de teste...\n');
  const { data: prods } = await supabase.from('products').select('id').ilike('name', '%[TESTE]%');
  if (!prods?.length) { console.log('Nenhum produto de teste encontrado.'); return; }
  const ids = prods.map(p => p.id);

  const { data: variants } = await supabase.from('product_variants').select('id').in('product_id', ids);
  if (variants?.length) {
    const vids = variants.map(v => v.id);
    await supabase.from('inventory').delete().in('variant_id', vids);
    await supabase.from('product_variant_attributes').delete().in('variant_id', vids);
    await supabase.from('product_variants').delete().in('id', vids);
    console.log(`  ✓ ${variants.length} variantes removidas`);
  }
  console.log('✅ Limpeza concluída.\n');
}

async function seed() {
  console.log('\n🌱 Adicionando variantes aos produtos de teste...\n');

  // Busca produtos de teste
  const { data: prods } = await supabase.from('products').select('id, name, base_price').ilike('name', '%[TESTE]%');
  if (!prods?.length) { console.log('Nenhum produto de teste encontrado. Rode o seed principal primeiro.'); return; }

  // Busca ou cria o atributo "Tamanho"
  let { data: attrTamanho } = await supabase.from('attributes').select('id').eq('name', 'Tamanho').maybeSingle();
  if (!attrTamanho) {
    const { data } = await supabase.from('attributes').insert({ name: 'Tamanho' }).select('id').single();
    attrTamanho = data!;
  }

  // Busca ou cria os valores de tamanho
  const tamanhos = ['PP', 'P', 'M', 'G', 'GG'];
  const attrValues: Record<string, number> = {};
  for (const t of tamanhos) {
    let { data: av } = await supabase.from('attribute_values').select('id').eq('attribute_id', attrTamanho!.id).eq('value', t).maybeSingle();
    if (!av) {
      const { data } = await supabase.from('attribute_values').insert({ attribute_id: attrTamanho!.id, value: t }).select('id').single();
      av = data!;
    }
    attrValues[t] = av!.id;
  }
  console.log('  ✓ Atributo "Tamanho" e valores prontos');

  // Estoque por tamanho: PP=0, P=3, M=10, G=5, GG=0  (PP e GG zerados de propósito)
  const estoques: Record<string, number> = { PP: 0, P: 3, M: 10, G: 5, GG: 0 };

  for (const prod of prods) {
    // Cria uma variante por tamanho
    for (const tam of tamanhos) {
      const sku = `${prod.id}-${tam}-TESTE`;

      const { data: variant, error: varErr } = await supabase
        .from('product_variants')
        .insert({
          product_id: prod.id,
          sku,
          price:     prod.base_price,
          is_active: true,
        })
        .select('id')
        .single();

      if (varErr) { console.error(`ERRO variante ${sku}:`, varErr.message); continue; }

      // Vincula atributo
      await supabase.from('product_variant_attributes').insert({
        variant_id:        variant.id,
        attribute_value_id: attrValues[tam],
      });

      // Cria estoque
      await supabase.from('inventory').insert({
        variant_id:          variant.id,
        quantity:            estoques[tam],
        reserved_quantity:   0,
        low_stock_threshold: 2,
      });
    }
    console.log(`  ✓ ${prod.name} — 5 variantes (PP, P, M, G, GG)`);
  }

  console.log('\n✅ Variantes criadas com sucesso!');
  console.log('💡 PP e GG estão com estoque 0 de propósito para testar o visual desabilitado.\n');
}

if (LIMPAR) limpar().catch(console.error);
else        seed().catch(console.error);
