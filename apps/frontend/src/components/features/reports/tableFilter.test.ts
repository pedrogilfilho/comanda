import { describe, expect, it } from 'vitest';
import { tableFilter } from './tableFilter';

describe('tableFilter', () => {
  const accounts = [{ tableIdentifier: '10' }, { tableIdentifier: '2' }, { tableIdentifier: '2' }];

  it('lista as mesas do período sem repetir, em ordem numérica', () => {
    expect(tableFilter(accounts, '').options).toEqual(['2', '10']);
  });

  it('mantém a mesa escolhida quando ela existe no período', () => {
    expect(tableFilter(accounts, '10').active).toBe('10');
  });

  it('mesa que sumiu do período (trocou a data) volta para todas', () => {
    expect(tableFilter(accounts, '5').active).toBe('');
  });
});
