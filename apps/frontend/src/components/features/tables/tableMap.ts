import type { Table } from '@/types/api';

export type TableSlot = { number: string; table: Table | null };

const isNumber = (s: string) => /^\d+$/.test(s);

// Mapa do salão: mesas 1..total (com a ocupada no lugar) e, depois, as ocupadas que
// ficaram de fora — acima do total (o admin diminuiu) ou com nome (mesas antigas).
export function buildTableMap(tables: Table[], total: number): TableSlot[] {
  const occupied = new Map(tables.filter((t) => t.status === 'OCCUPIED').map((t) => [t.identifier, t]));
  const slots: TableSlot[] = Array.from({ length: total }, (_, i) => {
    const number = String(i + 1);
    return { number, table: occupied.get(number) ?? null };
  });
  const inGrid = new Set(slots.map((s) => s.number));
  const extra = [...occupied.values()].filter((t) => !inGrid.has(t.identifier));
  const numbered = extra.filter((t) => isNumber(t.identifier)).sort((a, b) => +a.identifier - +b.identifier);
  const named = extra
    .filter((t) => !isNumber(t.identifier))
    .sort((a, b) => a.identifier.localeCompare(b.identifier, 'pt-BR'));
  return [...slots, ...[...numbered, ...named].map((t) => ({ number: t.identifier, table: t }))];
}
