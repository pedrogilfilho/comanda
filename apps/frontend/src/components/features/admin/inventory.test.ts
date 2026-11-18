import { describe, expect, it } from 'vitest';
import type { Product } from '@/types/api';
import { changedItems, parseCount, toCountInput } from './inventory';

const product = (over: Partial<Product>): Product =>
  ({ id: 'p', name: 'Item', isMeat: false, stock: 0, ...over }) as Product;

describe('parseCount', () => {
  it('carne em kg vira gramas', () => {
    expect(parseCount('2,5', true)).toBe(2500);
    expect(parseCount('1.25', true)).toBe(1250);
    expect(parseCount('0', true)).toBe(0);
  });

  it('unidades só inteiras', () => {
    expect(parseCount('3', false)).toBe(3);
    expect(parseCount('2,5', false)).toBeNull();
  });

  it('recusa vazio, negativo e texto', () => {
    expect(parseCount('', false)).toBeNull();
    expect(parseCount('-1', false)).toBeNull();
    expect(parseCount('abc', true)).toBeNull();
  });
});

describe('toCountInput', () => {
  it('mostra kg com vírgula para carne e unidades para o resto', () => {
    expect(toCountInput(product({ isMeat: true, stock: 2500 }))).toBe('2,5');
    expect(toCountInput(product({ stock: 12 }))).toBe('12');
  });
});

describe('changedItems', () => {
  const beer = product({ id: 'b', name: 'Cerveja', stock: 10 });
  const meat = product({ id: 'm', name: 'Picanha', isMeat: true, stock: 5000 });

  it('devolve só os itens alterados', () => {
    expect(changedItems([beer, meat], { b: '7', m: '5' })).toEqual({
      items: [{ productId: 'b', stock: 7 }],
    });
  });

  it('item sem valor digitado conta como sem mudança', () => {
    expect(changedItems([beer, meat], { m: '4,2' })).toEqual({
      items: [{ productId: 'm', stock: 4200 }],
    });
  });

  it('aponta os itens com valor inválido', () => {
    expect(changedItems([beer, meat], { b: '2,5', m: '-1' })).toEqual({ invalid: ['Cerveja', 'Picanha'] });
  });
});
