/**
 * Cria 9 coleções adicionais, associando produtos existentes e usando a imagem
 * de um dos produtos como capa. Idempotente: pula coleções de mesmo nome.
 * Rodar: npx ts-node src/scripts/seed-colecoes-extra.ts
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
function slugify(s: string): string {
  return norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function shuffle<T>(a: T[]): T[] {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Coleções a criar — keywords casam com o nome da categoria (sem acento).
// keywords vazio = amostra geral de produtos.
const DEFS: { nome: string; keywords: string[] }[] = [
  { nome: 'Streetwear',    keywords: ['camiseta', 'moletom', 'jaqueta', 'bone', 'acessorio'] },
  { nome: 'Verão',         keywords: ['camiseta', 'short', 'vestido', 'regata'] },
  { nome: 'Inverno',       keywords: ['moletom', 'jaqueta', 'casaco', 'calca'] },
  { nome: 'Clássicos',     keywords: ['camisa', 'calca', 'jeans'] },
  { nome: 'Urbano',        keywords: ['jeans', 'camiseta', 'tenis', 'bone'] },
  { nome: 'Casual',        keywords: ['camiseta', 'calca', 'short'] },
  { nome: 'Alfaiataria',   keywords: ['camisa', 'calca', 'blazer'] },
  { nome: 'Acessórios',    keywords: ['acessorio', 'bone', 'bolsa', 'cinto'] },
  { nome: 'Monocromático', keywords: [] },
];

async function main() {
  console.log('\n🗂  Criando coleções adicionais...\n');

  const { data: cats } = await supabase.from('categories').select('id, name');
  const catName = new Map<number, string>();
  (cats ?? []).forEach(c => catName.set(c.id, norm(c.name)));

  const { data: prods } = await supabase
    .from('products')
    .select('id, category_id, product_images(url, is_primary, sort_order)')
    .eq('is_active', true);

  type P = { id: number; cat: string; img: string | null };
  const produtos: P[] = (prods ?? []).map((p: any) => {
    const imgs = (p.product_images ?? []).slice().sort(
      (a: any, b: any) =>
        (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) ||
        (a.sort_order ?? 0) - (b.sort_order ?? 0)
    );
    return { id: p.id, cat: catName.get(p.category_id) ?? '', img: imgs[0]?.url ?? null };
  });

  const { data: existentes } = await supabase.from('collections').select('name');
  const nomesExistentes = new Set((existentes ?? []).map(c => norm(c.name)));

  let criadas = 0;
  for (let idx = 0; idx < DEFS.length; idx++) {
    const def = DEFS[idx];
    if (nomesExistentes.has(norm(def.nome))) {
      console.log(`  ↷ ${def.nome} já existe — pulando`);
      continue;
    }

    let candidatos = def.keywords.length
      ? produtos.filter(p => def.keywords.some(k => p.cat.includes(k)))
      : [];
    if (candidatos.length < 6) candidatos = produtos; // fallback: amostra geral
    const escolhidos = shuffle(candidatos).slice(0, 22);
    const img = escolhidos.find(p => p.img)?.img ?? null;

    const { data: col, error } = await supabase
      .from('collections')
      .insert({
        name: def.nome,
        slug: slugify(def.nome) + '-' + (idx + 10),
        image_url: img,
        is_active: true,
        sort_order: idx + 10,
      } as any)
      .select('id')
      .single();

    if (error || !col) {
      console.log(`  ✗ ${def.nome}: ${error?.message}`);
      continue;
    }

    const vinculos = escolhidos.map((p, i) => ({
      collection_id: col.id,
      product_id: p.id,
      sort_order: i,
    }));
    if (vinculos.length) await supabase.from('collection_products').insert(vinculos as any);
    console.log(`  ✓ ${def.nome} (${vinculos.length} produtos)`);
    criadas++;
  }

  console.log(`\n✅ ${criadas} coleções criadas.\n`);
}

main().catch(console.error);
