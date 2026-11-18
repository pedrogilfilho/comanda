import { cx } from '@/lib/cx';

// Bloco pulsando enquanto o conteúdo carrega (parado com movimento reduzido)
export default function Skeleton({ className = 'h-32 rounded-md' }: { className?: string }) {
  return <div className={cx('animate-pulse bg-surface-2', className)} aria-hidden />;
}

// Várias linhas de esqueleto para listas
export function SkeletonList({ rows = 3, className = 'h-16' }: { rows?: number; className?: string }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Carregando">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={cx('rounded-md', className)} />
      ))}
    </div>
  );
}
