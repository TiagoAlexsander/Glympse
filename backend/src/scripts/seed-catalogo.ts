/**
 * Seed de catálogo completo — 50 produtos com variantes e imagens reais.
 * Adiciona produtos novos sem apagar os existentes.
 *
 * Rodar:  npx ts-node src/scripts/seed-catalogo.ts
 * Limpar: npx ts-node src/scripts/seed-catalogo.ts --clean
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
// IMAGENS — IDs reais do Unsplash por tema
// ─────────────────────────────────────────
const FOTOS = {
  camiseta: [
    ['1521572163474-6864f9cf17ab','1503342217505-b0a15ec3261c'],
    ['1583743814966-8d4e6e0e8e4c','1539109136881-3be0616acf4b'],
    ['1576566588028-4147f3842f27','1594938298603-a3d9c1d4a5c3'],
    ['1523381140794-a1eef0a15e4a','1523381210434-271e8be1f52b'],
    ['1532453288672-3a47628974cf','1490481651871-ab68de25d43d'],
    ['1553521042-f04c483dbb2c','1487222477894-8a7644aaab40'],
    ['1618453292459-37cb0fd97a72','1622445275992-2d82e36e4e48'],
    ['1591047139829-d91aecb6caea','1598554741943-6d0c7a09b8dc'],
    ['1516762689617-e1cffcef479d','1550614000-68f2b6c57a49'],
    ['1559582798-678dfc71ccd8','1507003211169-0a1dd7228f2d'],
  ],
  calca: [
    ['1542291026-7eec264c27ff','1517841905240-472988babdf9'],
    ['1584370848010-d7fe6bc767ec','1473966968600-fa801b869a1a'],
    ['1542295669297-4d5e35db2a55','1467043153537-a4fba2cd0ef5'],
    ['1548690312-855bcdedad54','1594938298603-a3d9c1d4a5c3'],
    ['1596755094514-f87e34085b2c','1604176354204-a4aa2ef81614'],
    ['1506629082955-511b1aa562c8','1465646936893-a904b107aabc'],
    ['1624378439575-d8705ad01fcb','1583744946564-b52ac1c389c8'],
    ['1602810316693-3667c854239a','1591047139829-d91aecb6caea'],
  ],
  vestido: [
    ['1558769132-cb1aea458c5e','1469334031218-e382a71b716b'],
    ['1515886657613-9f3515b0c78f','1529139574466-a303027bc9cb'],
    ['1554568218-0f1715e72254','1595777457583-95e059d581b8'],
    ['1525507119028-ed4c629a60a3','1509631179647-0177331693ae'],
    ['1583744946564-b52ac1c389c8','1572804013427-4d7ca7268217'],
    ['1596755094514-f87e34085b2c','1612722432474-b971cdcea546'],
    ['1539008835657-9e8e9680c956','1573441025877-73fc0e10be46'],
    ['1566174353658-617d98dc98b0','1581338834647-b0fb40704e21'],
  ],
  jaqueta: [
    ['1520367445093-50dc08a59d9d','1551489186-cf8726f514f8'],
    ['1546185849-87e59b5c6f7e','1548624313-9c3eb7e45c41'],
    ['1515886657613-9f3515b0c78f','1534030347209-467a573f3f63'],
    ['1519058082700-08a9c6cf9e49','1562572159-4efc207f5aff'],
    ['1614632537197-38a17061c2bd','1548624313-9c3eb7e45c41'],
    ['1591047139829-d91aecb6caea','1539109136881-3be0616acf4b'],
    ['1547624643-b7cc6e9b0d43','1617137968427-85924e36a9b5'],
    ['1552374536-7f25cdf7a8f8','1546938576-6ab9afb52b5b'],
  ],
  moletom: [
    ['1556821840-3a63f8550908','1556821840-3a63f8550908'],
    ['1572804013427-4d7ca7268217','1521572163474-6864f9cf17ab'],
    ['1604176354204-a4aa2ef81614','1542291026-7eec264c27ff'],
    ['1576566588028-4147f3842f27','1550614000-68f2b6c57a49'],
    ['1614632537197-38a17061c2bd','1556821840-3a63f8550908'],
    ['1519058082700-08a9c6cf9e49','1584370848010-d7fe6bc767ec'],
  ],
  shorts: [
    ['1594938298603-a3d9c1d4a5c3','1473966968600-fa801b869a1a'],
    ['1517841905240-472988babdf9','1542295669297-4d5e35db2a55'],
    ['1465646936893-a904b107aabc','1624378439575-d8705ad01fcb'],
    ['1602810316693-3667c854239a','1467043153537-a4fba2cd0ef5'],
  ],
  acessorio: [
    ['1553521042-f04c483dbb2c','1487222477894-8a7644aaab40'],
    ['1584308918021-89e8b0e70d64','1619706669957-0e7c0be5ffd0'],
    ['1523371054106-338a00cef462','1576566588028-4147f3842f27'],
    ['1626639010714-1e3f7b280bf7','1545558014-8692077e9b5c'],
  ],
};

function imgUrl(id: string): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=80`;
}

// ─────────────────────────────────────────
// LIMPAR
// ─────────────────────────────────────────
async function limpar() {
  console.log('\n🧹 Limpando catálogo de teste...\n');

  const { data: prods } = await supabase.from('products').select('id').ilike('slug', '%-cat-%');
  if (prods?.length) {
    const ids = prods.map(p => p.id);
    const { data: variants } = await supabase.from('product_variants').select('id').in('product_id', ids);
    if (variants?.length) {
      const vids = variants.map(v => v.id);
      await supabase.from('inventory').delete().in('variant_id', vids);
      await supabase.from('product_variant_attributes').delete().in('variant_id', vids);
      await supabase.from('product_variants').delete().in('id', vids);
    }
    await supabase.from('collection_products').delete().in('product_id', ids);
    await supabase.from('product_images').delete().in('product_id', ids);
    await supabase.from('products').delete().in('id', ids);
    console.log(`  ✓ ${prods.length} produto(s) removido(s)`);
  }
  console.log('✅ Limpeza concluída.\n');
}

// ─────────────────────────────────────────
// SEED PRINCIPAL
// ─────────────────────────────────────────
async function seed() {
  console.log('\n🌱 Criando catálogo com 50 produtos...\n');

  // ── 1. Categorias ────────────────────────────────────────────────────────
  console.log('📁 Criando/recuperando categorias...');

  async function obterOuCriarCategoria(nome: string, slug: string, ordem: number) {
    const { data: existente } = await supabase.from('categories').select('id').eq('slug', slug).maybeSingle();
    if (existente) return existente;
    const { data } = await supabase.from('categories')
      .insert({ name: nome, slug, sort_order: ordem, is_active: true })
      .select('id').single();
    return data!;
  }

  const cats = {
    camisetas: await obterOuCriarCategoria('[TESTE] Camisetas',  'camisetas-teste',  1),
    calcas:    await obterOuCriarCategoria('[TESTE] Calças',     'calcas-teste',     2),
    vestidos:  await obterOuCriarCategoria('[TESTE] Vestidos',   'vestidos-teste',   3),
    acessorios:await obterOuCriarCategoria('[TESTE] Acessórios', 'acessorios-teste', 4),
    jaquetas:  await obterOuCriarCategoria('[TESTE] Jaquetas',   'jaquetas-teste',   5),
    moletom:   await obterOuCriarCategoria('[TESTE] Moletom',    'moletom-teste',    6),
    shorts:    await obterOuCriarCategoria('[TESTE] Shorts',     'shorts-teste',     7),
  };
  console.log('  ✓ 7 categorias prontas');

  // ── 2. Coleções ───────────────────────────────────────────────────────────
  async function obterOuCriarColecao(nome: string, slug: string) {
    const { data: ex } = await supabase.from('collections').select('id').eq('slug', slug).maybeSingle();
    if (ex) return ex;
    const { data } = await supabase.from('collections')
      .insert({ name: nome, slug, is_active: true, sort_order: 1 })
      .select('id').single();
    return data!;
  }

  const cols = {
    verao:      await obterOuCriarColecao('[TESTE] Verão 2025',   'verao-2025-teste'),
    lancamentos:await obterOuCriarColecao('[TESTE] Lançamentos',  'lancamentos-teste'),
    promocoes:  await obterOuCriarColecao('[TESTE] Promoções',    'promocoes-teste'),
    inverno:    await obterOuCriarColecao('[TESTE] Inverno 2025', 'inverno-2025-teste'),
    basicos:    await obterOuCriarColecao('[TESTE] Básicos',      'basicos-teste'),
  };
  console.log('  ✓ 5 coleções prontas\n');

  // ── 3. Definição dos 44 novos produtos ───────────────────────────────────
  // (os 6 do seed.ts já existem; esses são os 44 novos para chegar a 50)
  type Produto = {
    name: string; slug: string; category_id: number;
    short_description: string; description: string;
    brand: string; material: string;
    base_price: number; compare_price: number | null;
    is_featured: boolean; tags: string[];
    fotos: [string, string]; // [id_principal, id_detalhe]
  };

  const novos: Produto[] = [
    // ── CAMISETAS (8) ──────────────────────────────────────────────────────
    {
      name: '[TESTE] Camiseta Tie-Dye Colorida', slug: 'camiseta-tie-dye-cat-01',
      category_id: cats.camisetas.id,
      short_description: 'Tie-dye artesanal, cada peça é única.',
      description: 'Camiseta em algodão com tingimento tie-dye manual. Cada unidade tem um padrão exclusivo. Modelagem unissex regular fit.',
      brand: 'Glympse Studio', material: '100% Algodão',
      base_price: 119.90, compare_price: 149.90, is_featured: true,
      tags: ['tie-dye', 'colorida', 'artesanal', 'unissex'],
      fotos: [FOTOS.camiseta[0][0], FOTOS.camiseta[0][1]],
    },
    {
      name: '[TESTE] Camiseta Polo Piquê Branca', slug: 'camiseta-polo-pique-cat-02',
      category_id: cats.camisetas.id,
      short_description: 'Polo clássica em piquê de algodão.',
      description: 'Camiseta polo em tecido piquê 100% algodão. Botões de madrepérola, gola e punhos ribana. Ideal para looks casuais e semi-formais.',
      brand: 'Glympse', material: '100% Algodão Piquê',
      base_price: 169.90, compare_price: 219.90, is_featured: false,
      tags: ['polo', 'piquê', 'clássica'],
      fotos: [FOTOS.camiseta[1][0], FOTOS.camiseta[1][1]],
    },
    {
      name: '[TESTE] Camiseta Estampada Grafismo', slug: 'camiseta-grafismo-cat-03',
      category_id: cats.camisetas.id,
      short_description: 'Estampa grafismo geométrico exclusiva.',
      description: 'Camiseta com estampa grafismo em serigrafia de alta qualidade. Não desbota na lavagem. Algodão penteado com caimento perfeito.',
      brand: 'Glympse Studio', material: '100% Algodão Penteado',
      base_price: 139.90, compare_price: null, is_featured: true,
      tags: ['estampada', 'grafismo', 'arte'],
      fotos: [FOTOS.camiseta[2][0], FOTOS.camiseta[2][1]],
    },
    {
      name: '[TESTE] Camiseta Cropped Rib', slug: 'camiseta-cropped-rib-cat-04',
      category_id: cats.camisetas.id,
      short_description: 'Cropped canelado, modelagem slim.',
      description: 'Camiseta cropped em tecido canelado ribana. Modelagem ajustada com comprimento justo na cintura. Básico que combina com tudo.',
      brand: 'Glympse', material: '95% Algodão, 5% Elastano',
      base_price: 99.90, compare_price: 129.90, is_featured: false,
      tags: ['cropped', 'canelado', 'ribana'],
      fotos: [FOTOS.camiseta[3][0], FOTOS.camiseta[3][1]],
    },
    {
      name: '[TESTE] Camiseta Muscle Fit Premium', slug: 'camiseta-muscle-fit-cat-05',
      category_id: cats.camisetas.id,
      short_description: 'Corte muscle, realça a silhueta.',
      description: 'Camiseta muscle fit em algodão elastano. Corte que valoriza o corpo sem apertar. Tecido com tratamento anti-pilling.',
      brand: 'Glympse Active', material: '92% Algodão, 8% Elastano',
      base_price: 149.90, compare_price: null, is_featured: true,
      tags: ['muscle fit', 'slim', 'premium'],
      fotos: [FOTOS.camiseta[4][0], FOTOS.camiseta[4][1]],
    },
    {
      name: '[TESTE] Camiseta Gola V Canelada', slug: 'camiseta-gola-v-cat-06',
      category_id: cats.camisetas.id,
      short_description: 'Gola V canelada, tecido ultra macio.',
      description: 'Camiseta de gola V em tecido canelado ultra macio. Modelagem regular com comprimento alongado. Perfeita para usar por dentro ou por fora.',
      brand: 'Glympse', material: '60% Algodão, 40% Modal',
      base_price: 109.90, compare_price: 139.90, is_featured: false,
      tags: ['gola v', 'canelada', 'modal'],
      fotos: [FOTOS.camiseta[5][0], FOTOS.camiseta[5][1]],
    },
    {
      name: '[TESTE] Camiseta Vintage Delavê', slug: 'camiseta-vintage-delave-cat-07',
      category_id: cats.camisetas.id,
      short_description: 'Efeito delavê envelhecido artesanal.',
      description: 'Camiseta com tratamento delavê que confere aparência vintage única. Cada peça passa por processo de lavagem artesanal. Algodão 100% pré-lavado.',
      brand: 'Glympse Vintage', material: '100% Algodão',
      base_price: 134.90, compare_price: 169.90, is_featured: false,
      tags: ['vintage', 'delavê', 'artesanal'],
      fotos: [FOTOS.camiseta[6][0], FOTOS.camiseta[6][1]],
    },
    {
      name: '[TESTE] Regata Básica Essential', slug: 'regata-basica-cat-08',
      category_id: cats.camisetas.id,
      short_description: 'Regata básica de algodão para o dia a dia.',
      description: 'Regata básica em algodão de alta qualidade. Modelagem regular sem costuras laterais. Curinga no guarda-roupa masculino e feminino.',
      brand: 'Glympse', material: '100% Algodão',
      base_price: 59.90, compare_price: 79.90, is_featured: false,
      tags: ['regata', 'básica', 'essential'],
      fotos: [FOTOS.camiseta[7][0], FOTOS.camiseta[7][1]],
    },

    // ── CALÇAS (7) ─────────────────────────────────────────────────────────
    {
      name: '[TESTE] Calça Jeans Skinny Azul', slug: 'calca-jeans-skinny-cat-09',
      category_id: cats.calcas.id,
      short_description: 'Skinny clássica em jeans premium.',
      description: 'Calça jeans skinny em denim premium de alta resistência. 5 bolsos, fechamento em zíper com botão. Lavagem escura de alta durabilidade.',
      brand: 'Glympse Denim', material: '98% Algodão, 2% Elastano',
      base_price: 299.90, compare_price: 389.90, is_featured: true,
      tags: ['jeans', 'skinny', 'denim'],
      fotos: [FOTOS.calca[0][0], FOTOS.calca[0][1]],
    },
    {
      name: '[TESTE] Calça Jogger Moletom Grafite', slug: 'calca-jogger-moletom-cat-10',
      category_id: cats.calcas.id,
      short_description: 'Jogger confortável com punho elástico.',
      description: 'Calça jogger em moletom 100% algodão. Cós com elástico e cordão regulável. Punhos com elástico e bolsos laterais com zíper. Conforto total.',
      brand: 'Glympse Active', material: '100% Algodão Moletom',
      base_price: 189.90, compare_price: 239.90, is_featured: false,
      tags: ['jogger', 'moletom', 'confortável'],
      fotos: [FOTOS.calca[1][0], FOTOS.calca[1][1]],
    },
    {
      name: '[TESTE] Calça Wide Leg Alfaiataria', slug: 'calca-wide-leg-alfaiataria-cat-11',
      category_id: cats.calcas.id,
      short_description: 'Wide leg fluida, caimento impecável.',
      description: 'Calça wide leg em tecido de alfaiataria fluido. Cintura alta, bolsos laterais. Perfeita para looks elegantes e casuais modernos.',
      brand: 'Glympse', material: '70% Poliéster, 30% Viscose',
      base_price: 279.90, compare_price: 359.90, is_featured: true,
      tags: ['wide leg', 'alfaiataria', 'elegante'],
      fotos: [FOTOS.calca[2][0], FOTOS.calca[2][1]],
    },
    {
      name: '[TESTE] Legging Supplex Cintura Alta', slug: 'legging-supplex-cat-12',
      category_id: cats.calcas.id,
      short_description: 'Legging com compressão leve, secagem rápida.',
      description: 'Legging em supplex com compressão leve. Cintura alta com elástico largo. Tecido com proteção UV50+. Ideal para academia e uso diário.',
      brand: 'Glympse Active', material: '80% Poliamida, 20% Elastano',
      base_price: 149.90, compare_price: null, is_featured: false,
      tags: ['legging', 'supplex', 'fitness'],
      fotos: [FOTOS.calca[3][0], FOTOS.calca[3][1]],
    },
    {
      name: '[TESTE] Calça Social Slim Preta', slug: 'calca-social-slim-cat-13',
      category_id: cats.calcas.id,
      short_description: 'Slim social com elastano, conforto o dia todo.',
      description: 'Calça social slim fit com toque de elastano para maior conforto e liberdade de movimento. Tecido anti-amassado. Ideal para reuniões e eventos.',
      brand: 'Glympse Premium', material: '65% Poliéster, 33% Viscose, 2% Elastano',
      base_price: 329.90, compare_price: 419.90, is_featured: false,
      tags: ['social', 'slim', 'formal'],
      fotos: [FOTOS.calca[4][0], FOTOS.calca[4][1]],
    },
    {
      name: '[TESTE] Calça Jeans Wide Leg Destroyed', slug: 'calca-jeans-wide-leg-cat-14',
      category_id: cats.calcas.id,
      short_description: 'Wide leg com detalhes destroyed modernos.',
      description: 'Calça jeans wide leg com lavagem clara e detalhes destroyed nas coxas. Tendência atual com muito estilo. Cintura alta com cós largo.',
      brand: 'Glympse Denim', material: '100% Algodão',
      base_price: 319.90, compare_price: 399.90, is_featured: true,
      tags: ['jeans', 'wide leg', 'destroyed'],
      fotos: [FOTOS.calca[5][0], FOTOS.calca[5][1]],
    },
    {
      name: '[TESTE] Calça Cargo Utilitária Preta', slug: 'calca-cargo-preta-cat-15',
      category_id: cats.calcas.id,
      short_description: 'Cargo utilitária com 6 bolsos laterais.',
      description: 'Calça cargo em sarja resistente com 6 bolsos laterais com velcro. Cintura ajustável. Design utilitário com cara moderna. Usável em diversas ocasiões.',
      brand: 'Glympse', material: '100% Algodão Sarja',
      base_price: 259.90, compare_price: 319.90, is_featured: false,
      tags: ['cargo', 'preta', 'utilitária'],
      fotos: [FOTOS.calca[6][0], FOTOS.calca[6][1]],
    },

    // ── VESTIDOS (7) ───────────────────────────────────────────────────────
    {
      name: '[TESTE] Vestido Longo Básico Preto', slug: 'vestido-longo-preto-cat-16',
      category_id: cats.vestidos.id,
      short_description: 'Longo básico preto, peça essencial.',
      description: 'Vestido longo básico em crepe de poliéster. Modelagem reta com fenda lateral discreta. Peça coringa para diversas ocasiões.',
      brand: 'Glympse', material: '100% Poliéster Crepe',
      base_price: 239.90, compare_price: 299.90, is_featured: true,
      tags: ['vestido', 'longo', 'preto', 'básico'],
      fotos: [FOTOS.vestido[0][0], FOTOS.vestido[0][1]],
    },
    {
      name: '[TESTE] Vestido Curto Xadrez Vichy', slug: 'vestido-curto-xadrez-cat-17',
      category_id: cats.vestidos.id,
      short_description: 'Xadrez vichy com gola redonda e manga curta.',
      description: 'Vestido curto em tecido xadrez vichy. Gola redonda, manga curta com babado. Botões frontais decorativos. Comprimento acima do joelho.',
      brand: 'Glympse', material: '100% Algodão',
      base_price: 189.90, compare_price: 239.90, is_featured: false,
      tags: ['vestido', 'xadrez', 'vichy', 'curto'],
      fotos: [FOTOS.vestido[1][0], FOTOS.vestido[1][1]],
    },
    {
      name: '[TESTE] Vestido Slip Dress Cetim', slug: 'vestido-slip-dress-cat-18',
      category_id: cats.vestidos.id,
      short_description: 'Slip dress em cetim acetinado.',
      description: 'Slip dress em cetim acetinado de alta qualidade. Alças finas, decote V sutil. Comprimento midi. Peça elegante para jantares e eventos.',
      brand: 'Glympse Premium', material: '100% Poliéster Cetim',
      base_price: 269.90, compare_price: 339.90, is_featured: true,
      tags: ['slip dress', 'cetim', 'elegante'],
      fotos: [FOTOS.vestido[2][0], FOTOS.vestido[2][1]],
    },
    {
      name: '[TESTE] Vestido Boho Longo Estampado', slug: 'vestido-boho-longo-cat-19',
      category_id: cats.vestidos.id,
      short_description: 'Estilo boho com estampa exclusiva.',
      description: 'Vestido longo no estilo boho em viscose fluidíssima. Decote com amarração, manga flare. Estampa exclusiva inspirada em arte étnica.',
      brand: 'Glympse Boho', material: '100% Viscose',
      base_price: 299.90, compare_price: null, is_featured: true,
      tags: ['boho', 'longo', 'estampado', 'viscose'],
      fotos: [FOTOS.vestido[3][0], FOTOS.vestido[3][1]],
    },
    {
      name: '[TESTE] Vestido Tubinho Azul Marinho', slug: 'vestido-tubinho-azul-cat-20',
      category_id: cats.vestidos.id,
      short_description: 'Tubinho clássico azul marinho com zíper.',
      description: 'Vestido tubinho em tecido encorpado azul marinho. Zíper costas, fechamento impecável. Modelagem ajustada na cintura. Elegância atemporal.',
      brand: 'Glympse Premium', material: '95% Poliéster, 5% Elastano',
      base_price: 279.90, compare_price: 349.90, is_featured: false,
      tags: ['tubinho', 'azul', 'elegante', 'formal'],
      fotos: [FOTOS.vestido[4][0], FOTOS.vestido[4][1]],
    },
    {
      name: '[TESTE] Vestido Chemise Listrado', slug: 'vestido-chemise-listrado-cat-21',
      category_id: cats.vestidos.id,
      short_description: 'Chemise estilo camisa com listras marinières.',
      description: 'Vestido chemise em tecido de algodão com listras marinières. Abotoamento frontal completo. Comprimento midi, cinto de amarrar incluso.',
      brand: 'Glympse', material: '100% Algodão',
      base_price: 219.90, compare_price: 279.90, is_featured: false,
      tags: ['chemise', 'listrado', 'marinières'],
      fotos: [FOTOS.vestido[5][0], FOTOS.vestido[5][1]],
    },
    {
      name: '[TESTE] Vestido Malha Canelada Rosa', slug: 'vestido-malha-canelada-cat-22',
      category_id: cats.vestidos.id,
      short_description: 'Malha canelada supermacia, ajustada ao corpo.',
      description: 'Vestido em malha canelada suave. Modelagem ajustada sem ser apertada. Comprimento midi, decote redondo. Rosa mineral, cor da temporada.',
      brand: 'Glympse', material: '65% Viscose, 30% Poliamida, 5% Elastano',
      base_price: 199.90, compare_price: null, is_featured: true,
      tags: ['malha', 'canelada', 'rosa', 'midi'],
      fotos: [FOTOS.vestido[6][0], FOTOS.vestido[6][1]],
    },

    // ── JAQUETAS (8) ───────────────────────────────────────────────────────
    {
      name: '[TESTE] Jaqueta Jeans Classic Blue', slug: 'jaqueta-jeans-classic-cat-23',
      category_id: cats.jaquetas.id,
      short_description: 'Jaqueta jeans clássica de média lavagem.',
      description: 'Jaqueta jeans clássica em denim rígido. Lavagem média, bolsos frontais com abas. Peça atemporal que combina com qualquer look.',
      brand: 'Glympse Denim', material: '100% Algodão Denim',
      base_price: 349.90, compare_price: 449.90, is_featured: true,
      tags: ['jaqueta', 'jeans', 'clássica', 'denim'],
      fotos: [FOTOS.jaqueta[0][0], FOTOS.jaqueta[0][1]],
    },
    {
      name: '[TESTE] Jaqueta Bomber Nylon Preta', slug: 'jaqueta-bomber-nylon-cat-24',
      category_id: cats.jaquetas.id,
      short_description: 'Bomber em nylon com forro listrado.',
      description: 'Jaqueta bomber em nylon impermeável. Forro interno listrado característico. Ribana nos punhos, barra e gola. Bolsos laterais e frontal com zíper.',
      brand: 'Glympse Urban', material: '100% Nylon, Forro 100% Poliéster',
      base_price: 399.90, compare_price: 499.90, is_featured: true,
      tags: ['bomber', 'nylon', 'streetwear'],
      fotos: [FOTOS.jaqueta[1][0], FOTOS.jaqueta[1][1]],
    },
    {
      name: '[TESTE] Blazer Oversized Off-White', slug: 'blazer-oversized-cat-25',
      category_id: cats.jaquetas.id,
      short_description: 'Blazer oversized com caimento elegante.',
      description: 'Blazer oversized em tecido de alfaiataria estruturado. Lapela entalhada, dois botões frontais. Pode ser usado como peça única ou em conjunto.',
      brand: 'Glympse Premium', material: '60% Poliéster, 40% Viscose',
      base_price: 469.90, compare_price: 589.90, is_featured: true,
      tags: ['blazer', 'oversized', 'alfaiataria', 'elegante'],
      fotos: [FOTOS.jaqueta[2][0], FOTOS.jaqueta[2][1]],
    },
    {
      name: '[TESTE] Jaqueta Couro Sintético Preta', slug: 'jaqueta-couro-sintetico-cat-26',
      category_id: cats.jaquetas.id,
      short_description: 'Couro sintético de alta qualidade.',
      description: 'Jaqueta em couro sintético premium de alta qualidade. Acabamento que imita o couro natural. Zíper frontal YKK, bolsos laterais com zíper.',
      brand: 'Glympse Urban', material: '100% Poliuretano',
      base_price: 429.90, compare_price: 549.90, is_featured: false,
      tags: ['couro', 'sintético', 'preta', 'moto'],
      fotos: [FOTOS.jaqueta[3][0], FOTOS.jaqueta[3][1]],
    },
    {
      name: '[TESTE] Corta-Vento Ripstop Verde', slug: 'corta-vento-ripstop-cat-27',
      category_id: cats.jaquetas.id,
      short_description: 'Ripstop leve, resistente ao vento e respingos.',
      description: 'Corta-vento em tecido ripstop ultraleve. Resistente ao vento e respingos. Capuz dobrável, bolsos com zíper. Ideal para atividades ao ar livre.',
      brand: 'Glympse Active', material: '100% Nylon Ripstop',
      base_price: 289.90, compare_price: 369.90, is_featured: false,
      tags: ['corta-vento', 'ripstop', 'outdoor'],
      fotos: [FOTOS.jaqueta[4][0], FOTOS.jaqueta[4][1]],
    },
    {
      name: '[TESTE] Blazer Xadrez Príncipe de Gales', slug: 'blazer-xadrez-cat-28',
      category_id: cats.jaquetas.id,
      short_description: 'Príncipe de gales sofisticado e moderno.',
      description: 'Blazer em tecido xadrez príncipe de gales. Estrutura firme com forro parcial. Dois botões, lapela notched. Um clássico que nunca sai de moda.',
      brand: 'Glympse Premium', material: '55% Lã, 45% Poliéster',
      base_price: 549.90, compare_price: 699.90, is_featured: true,
      tags: ['blazer', 'xadrez', 'príncipe de gales', 'elegante'],
      fotos: [FOTOS.jaqueta[5][0], FOTOS.jaqueta[5][1]],
    },
    {
      name: '[TESTE] Jaqueta Teddy Sherpa Creme', slug: 'jaqueta-teddy-sherpa-cat-29',
      category_id: cats.jaquetas.id,
      short_description: 'Teddy macia como pelúcia, super quentinha.',
      description: 'Jaqueta teddy em tecido sherpa de pelúcia. Incrível maciez e conforto térmico. Bolsos laterais embutidos. Gola alta e aconchegante.',
      brand: 'Glympse Inverno', material: '100% Poliéster Sherpa',
      base_price: 389.90, compare_price: 489.90, is_featured: false,
      tags: ['teddy', 'sherpa', 'inverno', 'quentinha'],
      fotos: [FOTOS.jaqueta[6][0], FOTOS.jaqueta[6][1]],
    },
    {
      name: '[TESTE] Trench Coat Bege Clássico', slug: 'trench-coat-bege-cat-30',
      category_id: cats.jaquetas.id,
      short_description: 'Trench coat clássico, ícone atemporal.',
      description: 'Trench coat bege clássico em gabardine resistente. Cinto removível, dois fileiras de botões. Comprimento abaixo do joelho. Peça investimento que dura décadas.',
      brand: 'Glympse Premium', material: '65% Algodão, 35% Poliéster',
      base_price: 689.90, compare_price: 869.90, is_featured: true,
      tags: ['trench coat', 'bege', 'clássico', 'elegante'],
      fotos: [FOTOS.jaqueta[7][0], FOTOS.jaqueta[7][1]],
    },

    // ── MOLETOM (6) ────────────────────────────────────────────────────────
    {
      name: '[TESTE] Moletom Canguru Essential Preto', slug: 'moletom-canguru-preto-cat-31',
      category_id: cats.moletom.id,
      short_description: 'Canguru básico premium, algodão 320g.',
      description: 'Moletom canguru em algodão 320g de alta qualidade. Interior felpudo supermacio. Bolso canguru frontal, capuz com cordão duplo.',
      brand: 'Glympse', material: '80% Algodão, 20% Poliéster',
      base_price: 189.90, compare_price: 239.90, is_featured: true,
      tags: ['moletom', 'canguru', 'básico', 'preto'],
      fotos: [FOTOS.moletom[0][0], FOTOS.moletom[0][1]],
    },
    {
      name: '[TESTE] Moletom Cropped Cinza Mescla', slug: 'moletom-cropped-cinza-cat-32',
      category_id: cats.moletom.id,
      short_description: 'Cropped felpudo, comprimento na cintura.',
      description: 'Moletom cropped em mescla cinza. Interior felpudo confortável. Comprimento na cintura, barra e punhos com ribana. Combina com calças e saias.',
      brand: 'Glympse', material: '70% Algodão, 30% Poliéster',
      base_price: 159.90, compare_price: 199.90, is_featured: false,
      tags: ['moletom', 'cropped', 'cinza', 'mescla'],
      fotos: [FOTOS.moletom[1][0], FOTOS.moletom[1][1]],
    },
    {
      name: '[TESTE] Moletom Zip Full Grafite', slug: 'moletom-zip-full-cat-33',
      category_id: cats.moletom.id,
      short_description: 'Zíper frontal completo, versatilidade total.',
      description: 'Moletom com zíper frontal completo YKK. Pode ser usado aberto como casaco. Interior felpudo, bolsos laterais com zíper. Capuz com regulagem.',
      brand: 'Glympse Active', material: '80% Algodão, 20% Poliéster',
      base_price: 229.90, compare_price: 289.90, is_featured: false,
      tags: ['moletom', 'zip', 'grafite', 'zíper'],
      fotos: [FOTOS.moletom[2][0], FOTOS.moletom[2][1]],
    },
    {
      name: '[TESTE] Moletom Tie-Dye Candy', slug: 'moletom-tie-dye-candy-cat-34',
      category_id: cats.moletom.id,
      short_description: 'Tie-dye candy em cores vibrantes.',
      description: 'Moletom com tingimento tie-dye em tons candy (rosa, lilás, azul). Cada peça é única. Interior felpudo e macio. Muito conforto com estilo.',
      brand: 'Glympse Studio', material: '80% Algodão, 20% Poliéster',
      base_price: 219.90, compare_price: 279.90, is_featured: true,
      tags: ['moletom', 'tie-dye', 'candy', 'colorido'],
      fotos: [FOTOS.moletom[3][0], FOTOS.moletom[3][1]],
    },
    {
      name: '[TESTE] Blusão de Moletom Oversize', slug: 'blusao-moletom-oversize-cat-35',
      category_id: cats.moletom.id,
      short_description: 'Blusão oversized sem capuz, o preferido da temporada.',
      description: 'Blusão oversized sem capuz em moletom pesado. Decote redondo com nervura. Modelagem caída e confortável. O básico premium que todo guarda-roupa precisa.',
      brand: 'Glympse', material: '100% Algodão',
      base_price: 179.90, compare_price: null, is_featured: false,
      tags: ['blusão', 'oversized', 'moletom'],
      fotos: [FOTOS.moletom[4][0], FOTOS.moletom[4][1]],
    },
    {
      name: '[TESTE] Moletom Universitário Branco', slug: 'moletom-universitario-branco-cat-36',
      category_id: cats.moletom.id,
      short_description: 'Estilo universitário americano clássico.',
      description: 'Moletom no estilo universitário americano. Número em chenille no peito, cós com ribana duplo. Referência preppy que nunca sai de moda.',
      brand: 'Glympse College', material: '75% Algodão, 25% Poliéster',
      base_price: 199.90, compare_price: 249.90, is_featured: true,
      tags: ['moletom', 'universitário', 'college', 'branco'],
      fotos: [FOTOS.moletom[5][0], FOTOS.moletom[5][1]],
    },

    // ── SHORTS (4) ─────────────────────────────────────────────────────────
    {
      name: '[TESTE] Short Jeans Médio Classic', slug: 'short-jeans-medio-cat-37',
      category_id: cats.shorts.id,
      short_description: 'Short jeans clássico de comprimento médio.',
      description: 'Short jeans de comprimento médio (acima do joelho). Lavagem clara com leve desfiado na barra. Cintura alta, 5 bolsos. Verão garantido.',
      brand: 'Glympse Denim', material: '100% Algodão',
      base_price: 159.90, compare_price: 199.90, is_featured: true,
      tags: ['short', 'jeans', 'médio', 'verão'],
      fotos: [FOTOS.shorts[0][0], FOTOS.shorts[0][1]],
    },
    {
      name: '[TESTE] Short de Sarja Cargo Bege', slug: 'short-sarja-cargo-cat-38',
      category_id: cats.shorts.id,
      short_description: 'Cargo curto com bolsos laterais amplos.',
      description: 'Short cargo em sarja de algodão. Bolsos laterais amplos com botão. Cós com cinto regulável. Comprimento até a metade da coxa. Estilo e funcionalidade.',
      brand: 'Glympse', material: '100% Algodão Sarja',
      base_price: 149.90, compare_price: 189.90, is_featured: false,
      tags: ['short', 'cargo', 'bege', 'bolsos'],
      fotos: [FOTOS.shorts[1][0], FOTOS.shorts[1][1]],
    },
    {
      name: '[TESTE] Short Esportivo Dry-Fit', slug: 'short-esportivo-dry-fit-cat-39',
      category_id: cats.shorts.id,
      short_description: 'Dry-fit com bermuda embutida, 2 em 1.',
      description: 'Short esportivo 2 em 1 com bermuda interna embutida. Tecido dry-fit com secagem ultra rápida. Bolso lateral com zíper. Ideal para corrida e academia.',
      brand: 'Glympse Active', material: '88% Poliéster, 12% Elastano',
      base_price: 129.90, compare_price: null, is_featured: false,
      tags: ['short', 'esportivo', 'dry-fit', 'academia'],
      fotos: [FOTOS.shorts[2][0], FOTOS.shorts[2][1]],
    },
    {
      name: '[TESTE] Short Alfaiataria Linho Areia', slug: 'short-alfaiataria-linho-cat-40',
      category_id: cats.shorts.id,
      short_description: 'Linho fresco, ideal para o verão urbano.',
      description: 'Short de alfaiataria em mistura de linho. Cintura alta, bolsos laterais de faca. Tecido fresquinho e levíssimo. Elegância descontraída para o verão.',
      brand: 'Glympse Premium', material: '55% Linho, 45% Algodão',
      base_price: 179.90, compare_price: 229.90, is_featured: true,
      tags: ['short', 'linho', 'alfaiataria', 'elegante'],
      fotos: [FOTOS.shorts[3][0], FOTOS.shorts[3][1]],
    },

    // ── ACESSÓRIOS (4) ─────────────────────────────────────────────────────
    {
      name: '[TESTE] Bolsa Tote Canvas Natural', slug: 'bolsa-tote-canvas-cat-41',
      category_id: cats.acessorios.id,
      short_description: 'Tote bag em canvas resistente com bolso interno.',
      description: 'Bolsa tote em canvas natural de alta resistência. Bolso interno com zíper, alças duplas reforçadas. Capacidade para notebook de 15". Estampa serigrafada exclusiva.',
      brand: 'Glympse', material: '100% Cotton Canvas',
      base_price: 119.90, compare_price: 149.90, is_featured: false,
      tags: ['bolsa', 'tote', 'canvas', 'sustentável'],
      fotos: [FOTOS.acessorio[0][0], FOTOS.acessorio[0][1]],
    },
    {
      name: '[TESTE] Cinto de Couro Legítimo Preto', slug: 'cinto-couro-legitimo-cat-42',
      category_id: cats.acessorios.id,
      short_description: 'Couro legítimo, fivela dourada clássica.',
      description: 'Cinto em couro legítimo de alta qualidade. Fivela dourada estilo pin buckle. Largura de 3,5cm. Disponível em tamanhos P a GG.',
      brand: 'Glympse Accessories', material: 'Couro Legítimo',
      base_price: 149.90, compare_price: 189.90, is_featured: false,
      tags: ['cinto', 'couro', 'clássico'],
      fotos: [FOTOS.acessorio[1][0], FOTOS.acessorio[1][1]],
    },
    {
      name: '[TESTE] Óculos de Sol Quadrado Retrô', slug: 'oculos-sol-quadrado-cat-43',
      category_id: cats.acessorios.id,
      short_description: 'Armação quadrada retrô com proteção UV400.',
      description: 'Óculos de sol com armação quadrada de acetato. Lentes com proteção UV400. Hastes metálicas reforçadas. Estojo rígido incluso. Estilo retrô atemporal.',
      brand: 'Glympse Eyewear', material: 'Armação Acetato, Lentes Policarbonato',
      base_price: 189.90, compare_price: 239.90, is_featured: true,
      tags: ['óculos', 'sol', 'quadrado', 'retrô', 'UV400'],
      fotos: [FOTOS.acessorio[2][0], FOTOS.acessorio[2][1]],
    },
    {
      name: '[TESTE] Bucket Hat Algodão Bege', slug: 'bucket-hat-algodao-cat-44',
      category_id: cats.acessorios.id,
      short_description: 'Chapéu bucket clássico em algodão.',
      description: 'Bucket hat em algodão lavável. Aba larga com proteção solar. Bordado discreto na lateral. Pode ser invertido. Proteção solar e estilo em um só item.',
      brand: 'Glympse', material: '100% Algodão',
      base_price: 89.90, compare_price: 109.90, is_featured: false,
      tags: ['bucket hat', 'chapéu', 'bege', 'verão'],
      fotos: [FOTOS.acessorio[3][0], FOTOS.acessorio[3][1]],
    },
  ];

  console.log(`👕 Inserindo ${novos.length} produtos...`);

  // Insere em lotes de 10
  const LOTE = 10;
  const todosProdutos: any[] = [];
  for (let i = 0; i < novos.length; i += LOTE) {
    const lote = novos.slice(i, i + LOTE).map(p => ({
      name:              p.name,
      slug:              p.slug,
      category_id:       p.category_id,
      short_description: p.short_description,
      description:       p.description,
      brand:             p.brand,
      material:          p.material,
      base_price:        p.base_price,
      compare_price:     p.compare_price,
      is_featured:       p.is_featured,
      is_active:         true,
      published_at:      new Date().toISOString(),
      tags:              p.tags,
    }));

    const { data, error } = await supabase.from('products').insert(lote).select('id, slug, name');
    if (error) { console.error('ERRO produtos:', error.message); return; }
    todosProdutos.push(...data!);
    process.stdout.write(`  ✓ ${Math.min(i + LOTE, novos.length)}/${novos.length} produtos inseridos\r`);
  }
  console.log(`\n  ✓ ${todosProdutos.length} produtos criados`);

  // ── 4. Imagens ────────────────────────────────────────────────────────────
  console.log('🖼  Adicionando imagens...');
  const imagens: any[] = [];
  todosProdutos.forEach((prod, idx) => {
    const dadosProd = novos.find(n => n.slug === prod.slug);
    const fotos = dadosProd?.fotos ?? [FOTOS.camiseta[0][0], FOTOS.camiseta[0][1]];
    imagens.push(
      { product_id: prod.id, url: imgUrl(fotos[0]), alt_text: prod.name,          sort_order: 1, is_primary: true  },
      { product_id: prod.id, url: imgUrl(fotos[1]), alt_text: prod.name + ' alt', sort_order: 2, is_primary: false },
    );
  });

  for (let i = 0; i < imagens.length; i += 20) {
    await supabase.from('product_images').insert(imagens.slice(i, i + 20));
  }
  console.log(`  ✓ ${imagens.length} imagens adicionadas`);

  // ── 5. Variantes + Estoque ────────────────────────────────────────────────
  console.log('📦 Criando variantes e estoque...');

  let attrTamanho = (await supabase.from('attributes').select('id').eq('name', 'Tamanho').maybeSingle()).data;
  if (!attrTamanho) {
    attrTamanho = (await supabase.from('attributes').insert({ name: 'Tamanho' }).select('id').single()).data!;
  }

  const tamanhos = ['PP', 'P', 'M', 'G', 'GG'];
  const attrValues: Record<string, number> = {};
  for (const t of tamanhos) {
    let av = (await supabase.from('attribute_values').select('id').eq('attribute_id', attrTamanho!.id).eq('value', t).maybeSingle()).data;
    if (!av) {
      av = (await supabase.from('attribute_values').insert({ attribute_id: attrTamanho!.id, value: t }).select('id').single()).data!;
    }
    attrValues[t] = av!.id;
  }

  // Estoques variados por produto para mais realismo
  function gerarEstoque(idx: number): Record<string, number> {
    const configs = [
      { PP: 0, P: 5,  M: 12, G: 8,  GG: 0  },
      { PP: 2, P: 8,  M: 15, G: 10, GG: 3  },
      { PP: 0, P: 3,  M: 20, G: 12, GG: 0  },
      { PP: 4, P: 6,  M: 10, G: 6,  GG: 2  },
      { PP: 0, P: 10, M: 18, G: 14, GG: 5  },
      { PP: 1, P: 4,  M: 8,  G: 4,  GG: 1  },
      { PP: 0, P: 0,  M: 6,  G: 3,  GG: 0  }, // quase sem estoque
      { PP: 5, P: 12, M: 25, G: 18, GG: 8  }, // bem estocado
    ];
    return configs[idx % configs.length];
  }

  let variantesTotal = 0;
  for (let pi = 0; pi < todosProdutos.length; pi++) {
    const prod = todosProdutos[pi];
    const estoques = gerarEstoque(pi);
    const prodOriginal = novos.find(n => n.slug === prod.slug);

    for (const tam of tamanhos) {
      const sku = `${prod.id}-${tam}-CAT`;
      const { data: variant } = await supabase
        .from('product_variants')
        .insert({ product_id: prod.id, sku, price: prodOriginal?.base_price ?? 99.90, is_active: true })
        .select('id').single();

      if (!variant) continue;

      await supabase.from('product_variant_attributes').insert({
        variant_id: variant.id, attribute_value_id: attrValues[tam],
      });

      await supabase.from('inventory').insert({
        variant_id: variant.id, quantity: estoques[tam],
        reserved_quantity: 0, low_stock_threshold: 3,
      });

      variantesTotal++;
    }
    process.stdout.write(`  ✓ ${pi + 1}/${todosProdutos.length} produtos com variantes\r`);
  }
  console.log(`\n  ✓ ${variantesTotal} variantes + estoques criados`);

  // ── 6. Vincular produtos às coleções ──────────────────────────────────────
  console.log('🔗 Vinculando às coleções...');

  const vinculos: any[] = [];
  todosProdutos.forEach((prod, idx) => {
    const p = novos.find(n => n.slug === prod.slug)!;
    // Jaquetas e moletom → inverno
    if (p.category_id === cats.jaquetas.id || p.category_id === cats.moletom.id) {
      vinculos.push({ collection_id: cols.inverno.id, product_id: prod.id, sort_order: idx });
    }
    // Vestidos e shorts → verão
    if (p.category_id === cats.vestidos.id || p.category_id === cats.shorts.id) {
      vinculos.push({ collection_id: cols.verao.id, product_id: prod.id, sort_order: idx });
    }
    // Produtos em destaque → lançamentos
    if (p.is_featured) {
      vinculos.push({ collection_id: cols.lancamentos.id, product_id: prod.id, sort_order: idx });
    }
    // Produtos com compare_price → promoções
    if (p.compare_price) {
      vinculos.push({ collection_id: cols.promocoes.id, product_id: prod.id, sort_order: idx });
    }
    // Camisetas e básicos → básicos
    if (p.category_id === cats.camisetas.id) {
      vinculos.push({ collection_id: cols.basicos.id, product_id: prod.id, sort_order: idx });
    }
  });

  for (let i = 0; i < vinculos.length; i += 20) {
    await supabase.from('collection_products').insert(vinculos.slice(i, i + 20));
  }
  console.log(`  ✓ ${vinculos.length} vínculos de coleção criados`);

  // ── Resumo ─────────────────────────────────────────────────────────────────
  const { count: totalProds } = await supabase
    .from('products').select('id', { count: 'exact', head: true }).ilike('name', '%[TESTE]%');

  console.log('\n✅ Catálogo criado com sucesso!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Produtos [TESTE] no banco : ${totalProds}`);
  console.log(`   Novos criados agora       : ${todosProdutos.length}`);
  console.log(`   Variantes criadas         : ${variantesTotal}`);
  console.log(`   Vínculos de coleção       : ${vinculos.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n💡 Para remover esses produtos: npx ts-node src/scripts/seed-catalogo.ts --clean\n');
}

if (LIMPAR) limpar().catch(console.error);
else        seed().catch(console.error);
