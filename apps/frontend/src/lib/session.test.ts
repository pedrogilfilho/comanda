import { describe, expect, it } from 'vitest';
import { activeFor, tokenIssuedAt } from './session';

const b64url = (o: object) =>
  btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const token = (payload: object) => `${b64url({ alg: 'HS256' })}.${b64url(payload)}.assinatura`;

describe('tokenIssuedAt', () => {
  it('lê o iat do token', () => {
    expect(tokenIssuedAt(token({ iat: 1_763_488_800, name: 'Zé' }))?.toISOString()).toBe(
      new Date(1_763_488_800_000).toISOString(),
    );
  });

  it.each([null, '', 'lixo', token({ name: 'sem iat' }), 'a.%%%.c'])('token inválido %p → null', (t) => {
    expect(tokenIssuedAt(t)).toBeNull();
  });
});

describe('activeFor', () => {
  const from = new Date('2026-11-18T18:00:00Z');
  it('minutos, horas e nunca negativo', () => {
    expect(activeFor(from, from.getTime() + 5 * 60_000)).toBe('ativo há 5 min');
    expect(activeFor(from, from.getTime() + 135 * 60_000)).toBe('ativo há 2h15');
    expect(activeFor(from, from.getTime() - 60_000)).toBe('ativo há 0 min');
  });
});
