import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTheme } from './useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('dois hooks ficam em sincronia (cabeçalho e Configurações)', () => {
    const a = renderHook(() => useTheme());
    const b = renderHook(() => useTheme());
    expect(b.result.current[0]).toBe('light');
    act(() => a.result.current[1]('dark'));
    expect(b.result.current[0]).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('começa com o tema salvo', () => {
    localStorage.setItem('comanda:tema', 'dark');
    const { result } = renderHook(() => useTheme());
    expect(result.current[0]).toBe('dark');
  });
});
