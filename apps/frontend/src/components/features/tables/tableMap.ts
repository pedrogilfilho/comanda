import type { Table } from '@/types/api';

export type TableSlot = { number: string; table: Table | null };

// Há quanto tempo a mesa está aberta: "há 5 min", "há 1h05"
export function openFor(iso: string, now: number): string {
  const min = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
  if (min < 60) return `há ${min} min`;
  return `há ${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`;
}

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
