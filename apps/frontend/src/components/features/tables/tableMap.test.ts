import { describe, expect, it } from 'vitest';
import type { Table } from '@/types/api';
import { buildTableMap, openFor } from './tableMap';

describe('openFor', () => {
  const t0 = new Date('2026-11-18T18:00:00Z');
  const at = (min: number) => t0.getTime() + min * 60_000;
  it('minutos até 59, depois horas', () => {
    expect(openFor(t0.toISOString(), at(5))).toBe('há 5 min');
    expect(openFor(t0.toISOString(), at(65))).toBe('há 1h05');
    expect(openFor(t0.toISOString(), at(-2))).toBe('há 0 min');
  });
});

const table = (identifier: string, status: Table['status'], clientName: string | null = null): Table => ({
  id: `id-${identifier}`,
  identifier,
  capacity: 4,
  status,
  clientName,
  openedBy: status === 'OCCUPIED' ? 'ana' : null,
  openedAt: new Date().toISOString(),
  subtotal: 0,
  serviceFee: 0,
  total: 0,
  inKitchen: 0,
  undelivered: 0,
});
const occ = (id: string, name?: string) => table(id, 'OCCUPIED', name ?? null);

describe('buildTableMap', () => {
  it('gera 1..30 com as ocupadas no lugar', () => {
    const map = buildTableMap([occ('3', 'Ana')], 30);
    expect(map).toHaveLength(30);
    expect(map[2]).toMatchObject({ number: '3', table: { clientName: 'Ana' } });
    expect(map[0]).toEqual({ number: '1', table: null });
  });

  it('mantém a ocupada acima do total até a conta fechar', () => {
    const map = buildTableMap([occ('35')], 30);
    expect(map).toHaveLength(31);
    expect(map.at(-1)?.number).toBe('35');
  });

  it('mesa com nome vem depois das numeradas', () => {
    const map = buildTableMap([occ('Varanda'), occ('40'), occ('32')], 30);
    expect(map.slice(-3).map((s) => s.number)).toEqual(['32', '40', 'Varanda']);
  });

  it('mesa livre do banco não ocupa o lugar nem cria lugar extra', () => {
    const map = buildTableMap([table('3', 'FREE'), table('50', 'FREE')], 30);
    expect(map).toHaveLength(30);
    expect(map[2].table).toBeNull();
  });
});
