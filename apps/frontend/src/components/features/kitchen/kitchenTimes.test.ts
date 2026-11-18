import { describe, expect, it } from 'vitest';
import { duration, kitchenTimes } from './kitchenTimes';

const t0 = new Date('2026-11-18T18:00:00Z').getTime();
const at = (min: number) => new Date(t0 + min * 60_000).toISOString();
const now = (min: number) => t0 + min * 60_000;

describe('duration', () => {
  it('minutos e horas, nunca negativo', () => {
    expect(duration(0, 5 * 60_000)).toBe('5 min');
    expect(duration(0, 65 * 60_000)).toBe('1h05');
    expect(duration(10 * 60_000, 0)).toBe('0 min');
  });
});

describe('kitchenTimes', () => {
  it('aguardando: há quanto tempo espera', () => {
    expect(
      kitchenTimes({ status: 'PENDING', createdAt: at(0), startedAt: null, readyAt: null }, now(4)),
    ).toBe('Esperando há 4 min');
  });

  it('em preparo: quanto esperou e há quanto prepara', () => {
    expect(
      kitchenTimes({ status: 'PREPARING', createdAt: at(0), startedAt: at(3), readyAt: null }, now(15)),
    ).toBe('Esperou 3 min · preparando há 12 min');
  });

  it('pronto: quanto levou o preparo e há quanto está pronto', () => {
    expect(
      kitchenTimes({ status: 'READY', createdAt: at(0), startedAt: at(3), readyAt: at(23) }, now(25)),
    ).toBe('Preparo levou 20 min · pronto há 2 min');
  });

  it('pedido antigo sem horários: só o tempo desde o lançamento', () => {
    expect(
      kitchenTimes({ status: 'PREPARING', createdAt: at(0), startedAt: null, readyAt: null }, now(70)),
    ).toBe('Lançado há 1h10');
  });
});
