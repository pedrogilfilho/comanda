'use client';

import { useCallback, useEffect, useState } from 'react';
import { THEME_EVENT, applyTheme, readTheme, type Theme } from '@/lib/theme';

// Tema atual da página; o cabeçalho e Configurações ficam em sincronia pelo evento
export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const sync = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
    setTheme(readTheme());
    window.addEventListener(THEME_EVENT, sync);
    return () => window.removeEventListener(THEME_EVENT, sync);
  }, []);

  const choose = useCallback((t: Theme) => applyTheme(t), []);
  return [theme, choose];
}
