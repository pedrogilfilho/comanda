'use client';

import type { ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Product, ProductCategory } from '@/types/api';
import { CATEGORY_LABEL, CATEGORY_ORDER } from '@/lib/format';
import { useOpenCategories } from '@/hooks/useOpenCategories';
import Button from './Button';
import Icon from './Icon';

interface CategorySectionsProps {
  storageKey: string;
  idPrefix: string;
  products: Product[];
  renderItem: (p: Product) => ReactNode;
}

// Lista agrupada por categoria; cada categoria abre e fecha, com "Abrir todas" e "Fechar todas"
export default function CategorySections({
  storageKey,
  idPrefix,
  products,
  renderItem,
}: CategorySectionsProps) {
  const { isOpen, toggle, openAll, closeAll } = useOpenCategories(storageKey);

  const grouped: Partial<Record<ProductCategory, Product[]>> = {};
  products.forEach((p) => (grouped[p.category] ??= []).push(p));
  const cats = CATEGORY_ORDER.filter((c) => grouped[c]?.length);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={() => openAll([...cats])}>
          Abrir todas
        </Button>
        <Button size="sm" variant="secondary" onClick={closeAll}>
          Fechar todas
        </Button>
      </div>
      {cats.map((cat) => {
        const open = isOpen(cat);
        const listId = `${idPrefix}-${cat}`;
        return (
          <section key={cat} className="rounded-md border border-hairline bg-surface">
            <h2>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={listId}
                onClick={() => toggle(cat)}
                className="flex min-h-tap w-full items-center gap-2 rounded-md px-3 text-left font-semibold text-ink hover:bg-surface-2"
              >
                <Icon icon={open ? ChevronDown : ChevronRight} className="text-ink-muted" />
                <span className="flex-1">{CATEGORY_LABEL[cat]}</span>
                <span className="text-sm font-normal text-ink-muted tabular-nums">
                  {grouped[cat]!.length}
                </span>
              </button>
            </h2>
            {open && (
              <ul id={listId} className="space-y-2 px-3 pb-3">
                {grouped[cat]!.map(renderItem)}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
