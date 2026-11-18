'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ProductCategory } from '@/types/api';

const PREFIX = 'comanda:categorias:';

function read(key: string): ProductCategory[] {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as ProductCategory[]) : [];
  } catch {
    return [];
  }
}

function write(key: string, open: ProductCategory[]) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(open));
  } catch {
    // sem armazenamento: só não lembra entre visitas
  }
}

// Categorias abertas de uma lista (cardápio, estoque). Começa tudo fechado e o
// navegador lembra o que ficou aberto, por tela.
export function useOpenCategories(storageKey: string) {
  const [open, setOpen] = useState<ProductCategory[]>([]);

  // Lido depois de montar, para o HTML do servidor e o do navegador baterem
  useEffect(() => setOpen(read(storageKey)), [storageKey]);

  const update = useCallback(
    (next: (prev: ProductCategory[]) => ProductCategory[]) =>
      setOpen((prev) => {
        const value = next(prev);
        write(storageKey, value);
        return value;
      }),
    [storageKey],
  );

  return {
    isOpen: (cat: ProductCategory) => open.includes(cat),
    toggle: (cat: ProductCategory) =>
      update((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat])),
    openAll: (cats: ProductCategory[]) => update(() => [...cats]),
    closeAll: () => update(() => []),
  };
}
