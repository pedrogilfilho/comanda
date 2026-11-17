import { SERVICE_FEE_RATE } from './constants';

// Valores sempre em centavos; carne em gramas com preço por kg.

export function meatSubtotal(grams: number, pricePerKgCents: number): number {
  return Math.round((grams * pricePerKgCents) / 1000);
}

export function itemSubtotal(quantity: number, unitPriceCents: number, weighed: boolean): number {
  return weighed ? meatSubtotal(quantity, unitPriceCents) : quantity * unitPriceCents;
}

export function serviceFee(subtotalCents: number): number {
  return Math.round(subtotalCents * SERVICE_FEE_RATE);
}

export function withServiceFee(subtotalCents: number): number {
  return subtotalCents + serviceFee(subtotalCents);
}

export function installmentValue(amountCents: number, installments: number): number {
  return Math.round(amountCents / Math.max(1, installments));
}
