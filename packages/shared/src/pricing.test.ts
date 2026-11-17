import { describe, expect, it } from 'vitest';
import { installmentValue, itemSubtotal, meatSubtotal, serviceFee, withServiceFee } from './pricing';
import { canTransition, isInKitchen, isUndelivered } from './order-status';

describe('pricing', () => {
  it('calcula carne por peso em centavos', () => {
    expect(meatSubtotal(350, 17800)).toBe(6230); // 350 g a R$ 178,00/kg = R$ 62,30
    expect(meatSubtotal(333, 10000)).toBe(3330);
  });

  it('calcula item por unidade e por peso', () => {
    expect(itemSubtotal(3, 1200, false)).toBe(3600);
    expect(itemSubtotal(500, 10000, true)).toBe(5000);
  });

  it('aplica a taxa de serviço com arredondamento', () => {
    expect(serviceFee(10005)).toBe(1001);
    expect(withServiceFee(10000)).toBe(11000);
  });

  it('divide parcelas', () => {
    expect(installmentValue(10000, 3)).toBe(3333);
    expect(installmentValue(10000, 0)).toBe(10000);
  });
});

describe('order status', () => {
  it('só permite transições para frente e cancelamento antes de pronto', () => {
    expect(canTransition('PENDING', 'PREPARING')).toBe(true);
    expect(canTransition('PREPARING', 'CANCELLED')).toBe(true);
    expect(canTransition('READY', 'CANCELLED')).toBe(false);
    expect(canTransition('DELIVERED', 'PENDING')).toBe(false);
    expect(canTransition('PENDING', 'CLOSED')).toBe(false);
  });

  it('distingue "na cozinha" de "não entregue"', () => {
    expect(isInKitchen('READY')).toBe(false);
    expect(isUndelivered('READY')).toBe(true);
  });
});
