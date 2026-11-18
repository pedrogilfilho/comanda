import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useOpenCategories } from './useOpenCategories';

describe('useOpenCategories', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('começa com tudo fechado', () => {
    const { result } = renderHook(() => useOpenCategories('teste'));
    expect(result.current.isOpen('CARNE')).toBe(false);
  });

  it('abre e fecha uma categoria', () => {
    const { result } = renderHook(() => useOpenCategories('teste'));
    act(() => result.current.toggle('CARNE'));
    expect(result.current.isOpen('CARNE')).toBe(true);
    expect(result.current.isOpen('BEBIDA')).toBe(false);
    act(() => result.current.toggle('CARNE'));
    expect(result.current.isOpen('CARNE')).toBe(false);
  });

  it('abre e fecha todas', () => {
    const { result } = renderHook(() => useOpenCategories('teste'));
    act(() => result.current.openAll(['CARNE', 'BEBIDA']));
    expect(result.current.isOpen('CARNE')).toBe(true);
    expect(result.current.isOpen('BEBIDA')).toBe(true);
    act(() => result.current.closeAll());
    expect(result.current.isOpen('CARNE')).toBe(false);
    expect(result.current.isOpen('BEBIDA')).toBe(false);
  });

  it('lembra o que ficou aberto na mesma chave', () => {
    const first = renderHook(() => useOpenCategories('teste'));
    act(() => first.result.current.toggle('CALDO'));
    first.unmount();
    const again = renderHook(() => useOpenCategories('teste'));
    expect(again.result.current.isOpen('CALDO')).toBe(true);
    const other = renderHook(() => useOpenCategories('outra'));
    expect(other.result.current.isOpen('CALDO')).toBe(false);
  });

  it('funciona sem localStorage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const { result } = renderHook(() => useOpenCategories('teste'));
    act(() => result.current.toggle('CARNE'));
    expect(result.current.isOpen('CARNE')).toBe(true);
  });
});
