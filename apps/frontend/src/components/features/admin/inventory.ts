import type { Product } from '@/types/api';

// Quantidade contada → valor do estoque: kg (aceita vírgula) vira gramas na carne;
// os demais itens só aceitam unidades inteiras. Inválido ou vazio → null.
export function parseCount(text: string, isMeat: boolean): number | null {
  const v = text.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(v)) return null;
  const n = Number(v);
  if (isMeat) return Math.round(n * 1000);
  return Number.isInteger(n) ? n : null;
}

// Estoque atual no formato do campo: "2,5" (kg) para carne, "12" para o resto
export const toCountInput = (p: Product) =>
  p.isMeat ? String(p.stock / 1000).replace('.', ',') : String(p.stock);

// Itens a enviar: os que diferem do estoque da tela e os que o usuário digitou (touched),
// mesmo iguais, porque a tela pode estar desatualizada e o servidor compara com o real.
// Produto sem valor no mapa fica como está.
export function changedItems(
  products: Product[],
  values: Record<string, string>,
  touched: ReadonlySet<string> = new Set(),
): { items: { productId: string; stock: number }[] } | { invalid: string[] } {
  const items: { productId: string; stock: number }[] = [];
  const invalid: string[] = [];
  for (const p of products) {
    const text = values[p.id];
    if (text === undefined) continue;
    const stock = parseCount(text, p.isMeat);
    if (stock === null) invalid.push(p.name);
    else if (stock !== p.stock || touched.has(p.id)) items.push({ productId: p.id, stock });
  }
  return invalid.length ? { invalid } : { items };
}
