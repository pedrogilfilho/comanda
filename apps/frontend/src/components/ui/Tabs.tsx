'use client';

import Link from 'next/link';
import { cx } from '@/lib/cx';

export interface TabItem {
  key: string;
  label: string;
  href?: string; // com href vira navegação (<Link>); sem, troca o conteúdo na mesma tela
}

interface TabsProps {
  items: TabItem[];
  active: string;
  onChange?: (key: string) => void;
  label: string;
  className?: string;
}

const itemClass = (active: boolean) =>
  cx(
    'inline-flex items-center min-h-tap px-4 rounded-sm text-sm font-semibold whitespace-nowrap transition-colors',
    active ? 'bg-surface text-ink shadow-[0_1px_2px_rgb(var(--ink)/0.12)]' : 'text-ink-muted hover:text-ink',
  );

// Faixa de abas que rola na horizontal no celular
export default function Tabs({ items, active, onChange, label, className }: TabsProps) {
  const isNav = items.some((i) => i.href);

  if (isNav) {
    return (
      <nav aria-label={label} className={cx('overflow-x-auto', className)}>
        <ul className="inline-flex gap-1 rounded-md bg-surface-2 p-1">
          {items.map((item) => (
            <li key={item.key}>
              <Link
                href={item.href!}
                aria-current={item.key === active ? 'page' : undefined}
                className={itemClass(item.key === active)}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <div className={cx('overflow-x-auto', className)}>
      <div role="tablist" aria-label={label} className="inline-flex gap-1 rounded-md bg-surface-2 p-1">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={item.key === active}
            onClick={() => onChange?.(item.key)}
            className={itemClass(item.key === active)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
