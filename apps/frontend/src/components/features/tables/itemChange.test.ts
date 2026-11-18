import { describe, expect, it } from 'vitest';
import { canChangeItem, parseNewQuantity, reasonsFor } from './itemChange';

describe('canChangeItem', () => {
  it('garçom só antes da cozinha começar', () => {
    expect(canChangeItem('GARCOM', 'PENDING')).toBe(true);
    expect(canChangeItem('GARCOM', 'PREPARING')).toBe(false);
    expect(canChangeItem('GARCOM', 'DELIVERED')).toBe(false);
  });

  it('gerente e admin enquanto o pedido está na conta', () => {
    for (const s of ['PENDING', 'PREPARING', 'READY', 'DELIVERED'] as const) {
      expect(canChangeItem('GERENTE', s)).toBe(true);
      expect(canChangeItem('ADMIN', s)).toBe(true);
    }
    expect(canChangeItem('GERENTE', 'CANCELLED')).toBe(false);
    expect(canChangeItem('ADMIN', 'CLOSED')).toBe(false);
    expect(canChangeItem('COZINHA', 'PENDING')).toBe(false);
  });
});

describe('reasonsFor', () => {
  it('garçom não registra perda', () => {
    expect(reasonsFor('GARCOM')).toEqual(['LANCADO_A_MAIS', 'LANCADO_ERRADO']);
    expect(reasonsFor('GERENTE')).toEqual(['LANCADO_A_MAIS', 'LANCADO_ERRADO', 'PERDA']);
  });
});

describe('parseNewQuantity', () => {
  it('unidades: inteiro menor que o atual', () => {
    expect(parseNewQuantity('1', 4)).toBe(1);
    expect(parseNewQuantity('0', 4)).toBe(0);
    expect(parseNewQuantity('4', 4)).toBeNull();
    expect(parseNewQuantity('1,5', 4)).toBeNull();
    expect(parseNewQuantity('', 4)).toBeNull();
  });

  it('carne: gramas inteiras', () => {
    expect(parseNewQuantity('300', 400)).toBe(300);
    expect(parseNewQuantity('400', 400)).toBeNull();
  });
});
