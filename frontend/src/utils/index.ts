export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

// Ordem canônica de tamanhos para exibição consistente
const ORDEM_TAMANHOS = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XGG', 'U',
  '34', '36', '38', '40', '42', '44', '46', '48', '50'];

// Retorna o índice de ordenação de um tamanho (desconhecidos vão para o fim)
export function ordemTamanho(tam: string): number {
  const i = ORDEM_TAMANHOS.indexOf((tam ?? '').toUpperCase());
  return i === -1 ? 999 : i;
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
