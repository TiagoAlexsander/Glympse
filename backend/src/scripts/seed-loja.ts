/**
 * Seed da loja: ~300 produtos com imagens reais do Pexels por categoria.
 * Requer PEXELS_API_KEY no .env (gratuito em https://www.pexels.com/api/).
 * Se a key faltar, usa picsum.photos?grayscale como fallback.
 *
 * Rodar (depois do reset-loja): npx ts-node src/scripts/seed-loja.ts
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const PEXELS_KEY = process.env.PEXELS_API_KEY ?? '';

// ── Configuração das categorias ────────────────────────────────────────────────
type Tipo = 'roupa' | 'calcado' | 'unico';
type CatCfg = {
  nome: string; slug: string; query: string; tipo: Tipo;
  noun: string; min: number; max: number; qtd: number;
  adjetivos: string[]; cores: string[];
};

const TAM_ROUPA   = ['PP', 'P', 'M', 'G', 'GG'];
const TAM_CALCADO = ['36', '37', '38', '39', '40', '41', '42', '43', '44'];
const TAM_UNICO   = ['U'];

const MARCAS = ['Glympse', 'Glympse Studio', 'Glympse Active', 'Glympse Premium', 'Glympse Urban', 'Glympse Essentials'];

const CORES = ['Preta', 'Branca', 'Cinza', 'Areia', 'Off-White', 'Grafite', 'Caramelo', 'Verde Militar', 'Bege', 'Azul Marinho'];

const CATEGORIAS: CatCfg[] = [
  { nome: 'Camisetas', slug: 'camisetas', query: 't-shirt fashion', tipo: 'roupa', noun: 'Camiseta', min: 59, max: 169, qtd: 36,
    adjetivos: ['Básica', 'Oversized', 'Estampada', 'Gola V', 'Slim', 'Vintage', 'Canelada', 'Premium', 'Boxy', 'Longline'], cores: CORES },
  { nome: 'Calças', slug: 'calcas', query: 'pants trousers fashion', tipo: 'roupa', noun: 'Calça', min: 149, max: 349, qtd: 32,
    adjetivos: ['Skinny', 'Wide Leg', 'Jogger', 'Alfaiataria', 'Cargo', 'Reta', 'Chino', 'Mom'], cores: CORES },
  { nome: 'Jeans', slug: 'jeans', query: 'jeans denim fashion', tipo: 'roupa', noun: 'Jeans', min: 199, max: 399, qtd: 28,
    adjetivos: ['Skinny', 'Wide Leg', 'Reto', 'Destroyed', 'Mom', 'Flare', 'Slim'], cores: ['Azul Claro', 'Azul Médio', 'Azul Escuro', 'Preto', 'Cinza'] },
  { nome: 'Vestidos', slug: 'vestidos', query: 'dress fashion model', tipo: 'roupa', noun: 'Vestido', min: 179, max: 459, qtd: 30,
    adjetivos: ['Longo', 'Midi', 'Curto', 'Slip', 'Chemise', 'Tubinho', 'Boho', 'Canelado'], cores: CORES },
  { nome: 'Jaquetas', slug: 'jaquetas', query: 'jacket coat fashion', tipo: 'roupa', noun: 'Jaqueta', min: 249, max: 689, qtd: 28,
    adjetivos: ['Jeans', 'Bomber', 'Corta-Vento', 'de Couro', 'Puffer', 'Trucker', 'Sherpa'], cores: CORES },
  { nome: 'Moletons', slug: 'moletons', query: 'hoodie sweatshirt fashion', tipo: 'roupa', noun: 'Moletom', min: 159, max: 329, qtd: 30,
    adjetivos: ['Canguru', 'Cropped', 'Zip Full', 'Oversized', 'Gola Redonda', 'Universitário'], cores: CORES },
  { nome: 'Camisas', slug: 'camisas', query: 'button shirt fashion', tipo: 'roupa', noun: 'Camisa', min: 129, max: 299, qtd: 26,
    adjetivos: ['Social', 'Oversized', 'Linho', 'Jeans', 'Listrada', 'Manga Curta', 'Slim'], cores: CORES },
  { nome: 'Saias & Shorts', slug: 'saias-shorts', query: 'skirt shorts fashion', tipo: 'roupa', noun: 'Short', min: 99, max: 229, qtd: 24,
    adjetivos: ['Jeans', 'Alfaiataria', 'Cargo', 'de Linho', 'Esportivo', 'Midi', 'Plissada'], cores: CORES },
  { nome: 'Calçados', slug: 'calcados', query: 'sneakers shoes fashion', tipo: 'calcado', noun: 'Tênis', min: 199, max: 599, qtd: 30,
    adjetivos: ['Chunky', 'Retrô', 'Minimalista', 'Running', 'Casual', 'Cano Alto', 'Slip-On'], cores: CORES },
  { nome: 'Acessórios', slug: 'acessorios', query: 'fashion accessories bag', tipo: 'unico', noun: 'Acessório', min: 49, max: 299, qtd: 26,
    adjetivos: ['Bolsa Tote', 'Cinto de Couro', 'Óculos de Sol', 'Bucket Hat', 'Boné', 'Mochila', 'Carteira', 'Bolsa Crossbody'], cores: CORES },
];

// ── Imagens via Pexels (com fallback picsum) ───────────────────────────────────
async function buscarImagens(query: string, seed: string): Promise<string[]> {
  if (!PEXELS_KEY) {
    // Fallback: picsum em P&B (não coerente, mas não quebra)
    return Array.from({ length: 40 }, (_, i) => `https://picsum.photos/seed/${seed}-${i}/800/1067?grayscale`);
  }
  try {
    const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=80&orientation=portrait`, {
      headers: { Authorization: PEXELS_KEY },
    });
    const data = await res.json();
    const urls = (data.photos ?? []).map((p: any) => p.src.portrait).filter(Boolean);
    if (urls.length === 0) throw new Error('sem fotos');
    return urls;
  } catch (e: any) {
    console.log(`  ⚠ Pexels falhou para "${query}" (${e.message}); usando picsum.`);
    return Array.from({ length: 40 }, (_, i) => `https://picsum.photos/seed/${seed}-${i}/800/1067?grayscale`);
  }
}

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function main() {
  console.log(`\n🌱 Seed da loja — fonte de imagens: ${PEXELS_KEY ? 'Pexels' : 'picsum (fallback)'}\n`);

  // Atributo "Tamanho" + valores
  let attr = (await supabase.from('attributes').select('id').eq('name', 'Tamanho').maybeSingle()).data;
  if (!attr) attr = (await supabase.from('attributes').insert({ name: 'Tamanho' } as any).select('id').single()).data!;
  const todosTamanhos = [...new Set([...TAM_ROUPA, ...TAM_CALCADO, ...TAM_UNICO])];
  const valorId: Record<string, number> = {};
  for (const t of todosTamanhos) {
    let av = (await supabase.from('attribute_values').select('id').eq('attribute_id', attr!.id).eq('value', t).maybeSingle()).data;
    if (!av) av = (await supabase.from('attribute_values').insert({ attribute_id: attr!.id, value: t } as any).select('id').single()).data!;
    valorId[t] = av!.id;
  }

  let totalProdutos = 0;
  const idsDestaque: number[] = [];
  const idsPorCategoria: Record<string, number[]> = {};

  for (let ci = 0; ci < CATEGORIAS.length; ci++) {
    const cat = CATEGORIAS[ci];
    process.stdout.write(`📁 ${cat.nome} — buscando imagens...\r`);

    // Categoria
    let categoria = (await supabase.from('categories').select('id').eq('slug', cat.slug).maybeSingle()).data;
    if (!categoria) categoria = (await supabase.from('categories')
      .insert({ name: cat.nome, slug: cat.slug, is_active: true, sort_order: ci } as any).select('id').single()).data!;

    const imgs = await buscarImagens(cat.query, cat.slug);
    const tamanhos = cat.tipo === 'calcado' ? TAM_CALCADO : cat.tipo === 'unico' ? TAM_UNICO : TAM_ROUPA;
    idsPorCategoria[cat.slug] = [];

    // Gera nomes únicos combinando adjetivo + cor
    const combos: { adj: string; cor: string }[] = [];
    for (const adj of cat.adjetivos) for (const cor of cat.cores) combos.push({ adj, cor });
    // embaralha
    combos.sort(() => Math.random() - 0.5);

    for (let i = 0; i < cat.qtd; i++) {
      const { adj, cor } = combos[i % combos.length];
      const nome = `${cat.noun} ${adj} ${cor}`;
      const preco = randInt(cat.min, cat.max) - 0.10;
      const temDesconto = Math.random() < 0.3;
      const comparePrice = temDesconto ? Math.round(preco * (1 + randInt(15, 40) / 100)) - 0.10 : null;
      const destaque = Math.random() < 0.15;

      const { data: prod } = await supabase.from('products').insert({
        name: nome,
        slug: `${slugify(nome)}-${ci}${i}${Date.now().toString(36).slice(-3)}`,
        category_id: categoria!.id,
        short_description: `${cat.noun} ${adj.toLowerCase()} na cor ${cor.toLowerCase()}.`,
        description: `${nome}. Peça da linha Glympse com acabamento premium e caimento moderno. Material de alta qualidade e durabilidade.`,
        brand: rand(MARCAS),
        base_price: preco,
        compare_price: comparePrice,
        is_active: true,
        is_featured: destaque,
        published_at: new Date().toISOString(),
      } as any).select('id').single();

      if (!prod) continue;
      totalProdutos++;
      idsPorCategoria[cat.slug].push(prod.id);
      if (destaque) idsDestaque.push(prod.id);

      // Imagens (2 por produto, do pool da categoria)
      const img1 = imgs[(i * 2) % imgs.length];
      const img2 = imgs[(i * 2 + 1) % imgs.length];
      await supabase.from('product_images').insert([
        { product_id: prod.id, url: img1, alt_text: nome, sort_order: 1, is_primary: true },
        { product_id: prod.id, url: img2, alt_text: nome, sort_order: 2, is_primary: false },
      ] as any);

      // Variantes + atributos + estoque
      for (const t of tamanhos) {
        const { data: variant } = await supabase.from('product_variants').insert({
          product_id: prod.id, sku: `${prod.id}-${t}`, price: preco, is_active: true,
        } as any).select('id').single();
        if (!variant) continue;
        await supabase.from('product_variant_attributes').insert({ variant_id: variant.id, attribute_value_id: valorId[t] } as any);
        // estoque variado (alguns esgotados/baixos para realismo)
        const r = Math.random();
        const qtd = r < 0.1 ? 0 : r < 0.25 ? randInt(1, 3) : randInt(5, 40);
        await supabase.from('inventory').insert({ variant_id: variant.id, quantity: qtd, reserved_quantity: 0, low_stock_threshold: 3 } as any);
      }
      process.stdout.write(`📁 ${cat.nome} — ${i + 1}/${cat.qtd} produtos          \r`);
    }
    console.log(`✓ ${cat.nome} — ${cat.qtd} produtos            `);
  }

  // ── Coleções ──────────────────────────────────────────────────────────────
  console.log('\n🗂  Criando coleções...');
  const colDefs = [
    { nome: 'Lançamentos', query: 'fashion editorial', ids: idsDestaque },
    { nome: 'Promoções',   query: 'fashion sale style', ids: [] as number[] },
    { nome: 'Essenciais',  query: 'minimalist fashion', ids: [...(idsPorCategoria['camisetas'] ?? []).slice(0, 10), ...(idsPorCategoria['calcas'] ?? []).slice(0, 8)] },
  ];

  // Promoções = produtos com compare_price
  const { data: comDesconto } = await supabase.from('products').select('id').not('compare_price', 'is', null).limit(40);
  colDefs[1].ids = (comDesconto ?? []).map(p => p.id);

  for (const cd of colDefs) {
    const imgs = await buscarImagens(cd.query, 'col-' + slugify(cd.nome));
    const { data: col } = await supabase.from('collections').insert({
      name: cd.nome, slug: slugify(cd.nome) + '-' + Date.now().toString(36).slice(-4),
      image_url: imgs[0] ?? null, is_active: true, sort_order: 1,
    } as any).select('id').single();
    if (!col) continue;
    const vinculos = [...new Set(cd.ids)].slice(0, 30).map((pid, idx) => ({ collection_id: col.id, product_id: pid, sort_order: idx }));
    if (vinculos.length) await supabase.from('collection_products').insert(vinculos as any);
    console.log(`  ✓ ${cd.nome} (${vinculos.length} produtos)`);
  }

  console.log(`\n✅ Concluído! ${totalProdutos} produtos criados, ${idsDestaque.length} em destaque.\n`);
}

main().catch(console.error);
