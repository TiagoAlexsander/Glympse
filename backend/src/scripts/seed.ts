/**
 * Script de seed para dados de teste.
 * Todos os registros têm "[TESTE]" no nome e "-teste" no slug.
 * Para rodar: npx ts-node src/scripts/seed.ts
 * Para limpar: npx ts-node src/scripts/seed.ts --clean
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

// ─────────────────────────────────────────
// LIMPAR DADOS DE TESTE
// ─────────────────────────────────────────
async function limpar() {
  console.log('\n🧹 Limpando dados de teste...\n');

  // Remove vínculos de coleção com produtos de teste
  const { data: prodsTeste } = await supabase.from('products').select('id').ilike('name', '%[TESTE]%');
  if (prodsTeste?.length) {
    await supabase.from('collection_products').delete().in('product_id', prodsTeste.map(p => p.id));
    await supabase.from('product_images').delete().in('product_id', prodsTeste.map(p => p.id));
    await supabase.from('products').delete().in('id', prodsTeste.map(p => p.id));
    console.log(`  ✓ ${prodsTeste.length} produto(s) removido(s)`);
  }

  const { data: colsTeste } = await supabase.from('collections').select('id').ilike('name', '%[TESTE]%');
  if (colsTeste?.length) {
    await supabase.from('collections').delete().in('id', colsTeste.map(c => c.id));
    console.log(`  ✓ ${colsTeste.length} coleção(ões) removida(s)`);
  }

  const { data: catsTeste } = await supabase.from('categories').select('id').ilike('name', '%[TESTE]%');
  if (catsTeste?.length) {
    await supabase.from('categories').delete().in('id', catsTeste.map(c => c.id));
    console.log(`  ✓ ${catsTeste.length} categoria(s) removida(s)`);
  }

  console.log('\n✅ Limpeza concluída.\n');
}

// ─────────────────────────────────────────
// POPULAR DADOS DE TESTE
// ─────────────────────────────────────────
async function seed() {
  console.log('\n🌱 Iniciando seed de dados de teste...\n');

  // 1. CATEGORIAS
  console.log('📁 Criando categorias...');
  const { data: cats, error: catErr } = await supabase
    .from('categories')
    .insert([
      { name: '[TESTE] Camisetas',   slug: 'camisetas-teste',   sort_order: 1, is_active: true },
      { name: '[TESTE] Calças',      slug: 'calcas-teste',      sort_order: 2, is_active: true },
      { name: '[TESTE] Vestidos',    slug: 'vestidos-teste',    sort_order: 3, is_active: true },
      { name: '[TESTE] Acessórios',  slug: 'acessorios-teste',  sort_order: 4, is_active: true },
    ])
    .select();

  if (catErr) { console.error('ERRO categorias:', catErr.message); return; }
  const [catCamisetas, catCalcas, catVestidos, catAcessorios] = cats!;
  console.log(`  ✓ ${cats!.length} categorias criadas`);

  // 2. COLEÇÕES
  console.log('🗂  Criando coleções...');
  const { data: cols, error: colErr } = await supabase
    .from('collections')
    .insert([
      { name: '[TESTE] Verão 2025',      slug: 'verao-2025-teste',      sort_order: 1, is_active: true },
      { name: '[TESTE] Lançamentos',     slug: 'lancamentos-teste',     sort_order: 2, is_active: true },
      { name: '[TESTE] Promoções',       slug: 'promocoes-teste',       sort_order: 3, is_active: true },
    ])
    .select();

  if (colErr) { console.error('ERRO coleções:', colErr.message); return; }
  const [colVerao, colLancamentos, colPromocoes] = cols!;
  console.log(`  ✓ ${cols!.length} coleções criadas`);

  // 3. PRODUTOS
  console.log('👕 Criando produtos...');
  const { data: prods, error: prodErr } = await supabase
    .from('products')
    .insert([
      {
        name: '[TESTE] Camiseta Branca Básica',
        slug: 'camiseta-branca-basica-teste',
        category_id: catCamisetas.id,
        short_description: 'Camiseta 100% algodão, modelagem regular fit.',
        description: 'Camiseta clássica em algodão premium. Perfeita para o dia a dia.',
        brand: 'Glympse',
        material: '100% Algodão',
        base_price: 89.90,
        compare_price: 119.90,
        is_featured: true,
        is_active: true,
        published_at: new Date().toISOString(),
        tags: ['básico', 'algodão', 'branco'],
      },
      {
        name: '[TESTE] Camiseta Preta Oversized',
        slug: 'camiseta-preta-oversized-teste',
        category_id: catCamisetas.id,
        short_description: 'Modelagem oversized com caimento moderno.',
        description: 'Camiseta oversized em algodão pesado. Estilo urbano e confortável.',
        brand: 'Glympse',
        material: '100% Algodão 280g',
        base_price: 129.90,
        compare_price: null,
        is_featured: true,
        is_active: true,
        published_at: new Date().toISOString(),
        tags: ['oversized', 'preta', 'streetwear'],
      },
      {
        name: '[TESTE] Calça Cargo Bege',
        slug: 'calca-cargo-bege-teste',
        category_id: catCalcas.id,
        short_description: 'Calça cargo com múltiplos bolsos laterais.',
        description: 'Calça cargo em sarja resistente. Funcional e estilosa.',
        brand: 'Glympse',
        material: '98% Algodão, 2% Elastano',
        base_price: 249.90,
        compare_price: 329.90,
        is_featured: false,
        is_active: true,
        published_at: new Date().toISOString(),
        tags: ['cargo', 'bege', 'bolsos'],
      },
      {
        name: '[TESTE] Vestido Midi Floral',
        slug: 'vestido-midi-floral-teste',
        category_id: catVestidos.id,
        short_description: 'Vestido midi com estampa floral exclusiva.',
        description: 'Vestido midi em tecido leve com estampa floral. Ideal para o verão.',
        brand: 'Glympse',
        material: '100% Viscose',
        base_price: 199.90,
        compare_price: 259.90,
        is_featured: true,
        is_active: true,
        published_at: new Date().toISOString(),
        tags: ['vestido', 'floral', 'midi', 'verão'],
      },
      {
        name: '[TESTE] Boné Aba Curva',
        slug: 'bone-aba-curva-teste',
        category_id: catAcessorios.id,
        short_description: 'Boné 6 panel com bordado frontal.',
        description: 'Boné estruturado 6 panel com ajuste traseiro em velcro.',
        brand: 'Glympse',
        material: '100% Algodão',
        base_price: 79.90,
        compare_price: null,
        is_featured: false,
        is_active: true,
        published_at: new Date().toISOString(),
        tags: ['boné', 'acessório', 'cap'],
      },
      {
        name: '[TESTE] Camiseta Listrada Manga Longa',
        slug: 'camiseta-listrada-manga-longa-teste',
        category_id: catCamisetas.id,
        short_description: 'Listras clássicas em manga longa.',
        description: 'Camiseta manga longa com listras horizontais. Modelagem slim fit.',
        brand: 'Glympse',
        material: '95% Algodão, 5% Elastano',
        base_price: 149.90,
        compare_price: 189.90,
        is_featured: false,
        is_active: true,
        published_at: new Date().toISOString(),
        tags: ['listrada', 'manga longa', 'slim'],
      },
    ])
    .select();

  if (prodErr) { console.error('ERRO produtos:', prodErr.message); return; }
  console.log(`  ✓ ${prods!.length} produtos criados`);

  // 4. IMAGENS DOS PRODUTOS (usando placeholder real)
  console.log('🖼  Adicionando imagens...');
  const imagens = prods!.flatMap((p, i) => [
    {
      product_id: p.id,
      url: `https://picsum.photos/seed/${p.slug}-1/800/1000`,
      alt_text: p.name,
      sort_order: 1,
      is_primary: true,
    },
    {
      product_id: p.id,
      url: `https://picsum.photos/seed/${p.slug}-2/800/1000`,
      alt_text: `${p.name} - detalhe`,
      sort_order: 2,
      is_primary: false,
    },
  ]);

  const { error: imgErr } = await supabase.from('product_images').insert(imagens);
  if (imgErr) { console.error('ERRO imagens:', imgErr.message); return; }
  console.log(`  ✓ ${imagens.length} imagens adicionadas`);

  // 5. VÍNCULOS PRODUTO ↔ COLEÇÃO
  console.log('🔗 Vinculando produtos às coleções...');
  const vinculos = [
    // Verão
    { collection_id: colVerao.id,       product_id: prods![3].id, sort_order: 1 }, // Vestido
    { collection_id: colVerao.id,       product_id: prods![0].id, sort_order: 2 }, // Camiseta branca
    { collection_id: colVerao.id,       product_id: prods![4].id, sort_order: 3 }, // Boné
    // Lançamentos
    { collection_id: colLancamentos.id, product_id: prods![1].id, sort_order: 1 }, // Oversized
    { collection_id: colLancamentos.id, product_id: prods![2].id, sort_order: 2 }, // Cargo
    { collection_id: colLancamentos.id, product_id: prods![5].id, sort_order: 3 }, // Listrada
    // Promoções
    { collection_id: colPromocoes.id,   product_id: prods![0].id, sort_order: 1 }, // Camiseta branca
    { collection_id: colPromocoes.id,   product_id: prods![2].id, sort_order: 2 }, // Cargo
    { collection_id: colPromocoes.id,   product_id: prods![3].id, sort_order: 3 }, // Vestido
  ];

  const { error: vincErr } = await supabase.from('collection_products').insert(vinculos);
  if (vincErr) { console.error('ERRO vínculos:', vincErr.message); return; }
  console.log(`  ✓ ${vinculos.length} vínculos criados`);

  console.log('\n✅ Seed concluído com sucesso!');
  console.log('\n📋 Resumo:');
  console.log(`   Categorias : ${cats!.length}`);
  console.log(`   Coleções   : ${cols!.length}`);
  console.log(`   Produtos   : ${prods!.length}`);
  console.log('\n💡 Para limpar os dados de teste: npx ts-node src/scripts/seed.ts --clean\n');
}

// ─────────────────────────────────────────
// ENTRADA
// ─────────────────────────────────────────
if (LIMPAR) {
  limpar().catch(console.error);
} else {
  seed().catch(console.error);
}
