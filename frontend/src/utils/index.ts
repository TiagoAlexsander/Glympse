export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

// Ordem canônica dos tamanhos por letra (roupas)
const ORDEM_LETRAS = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XGG', 'U'];

// Retorna o índice de ordenação de um tamanho.
// Letras seguem a ordem canônica; números (ex: tênis 37, 38, 39...) são
// ordenados pelo valor numérico e vêm depois das letras; desconhecidos no fim.
export function ordemTamanho(tam: string): number {
  const t = (tam ?? '').toUpperCase().trim();
  const i = ORDEM_LETRAS.indexOf(t);
  if (i !== -1) return i;
  const n = parseFloat(t.replace(',', '.'));
  if (!isNaN(n)) return 1000 + n; // qualquer número, em ordem crescente
  return 9999;
}

// Lista de tamanhos sugeridos ao criar um produto
export const TAMANHOS_SUGERIDOS = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'U'];

// Formata um número como moeda brasileira: 149.9 → "R$ 149,90"
export function formatarReal(valor: number | null | undefined): string {
  const n = typeof valor === 'number' ? valor : 0;
  return n.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Formata uma data ISO para o padrão brasileiro: "12 de jun. de 2026"
export function formatarData(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// Formata data + hora: "12/06/2026 17:13"
export function formatarDataHora(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
