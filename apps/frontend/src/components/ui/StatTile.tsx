import { cx } from '@/lib/cx';

interface StatTileProps {
  label: string;
  value: React.ReactNode;
  tone?: 'ink' | 'accent' | 'success';
}

const TONE = { ink: 'text-ink', accent: 'text-accent-strong', success: 'text-success' };

// Número de destaque com rótulo (em linha no celular, empilhado a partir de 640px)
export default function StatTile({ label, value, tone = 'ink' }: StatTileProps) {
  return (
    <div className="rounded-md border border-hairline bg-surface px-4 py-3 sm:p-5 flex items-center justify-between gap-3 sm:block">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className={cx('font-display text-xl sm:text-2xl font-bold sm:mt-1 whitespace-nowrap', TONE[tone])}>
        {value}
      </p>
    </div>
  );
}
