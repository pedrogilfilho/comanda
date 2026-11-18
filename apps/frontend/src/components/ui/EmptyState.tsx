import type { LucideIcon } from 'lucide-react';
import Icon from './Icon';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

// Lista vazia: diz o que falta e, quando dá, o que fazer
export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-md border border-dashed border-hairline px-4 py-10 text-center">
      {icon && <Icon icon={icon} size={28} className="mx-auto mb-3 text-ink-muted" />}
      <p className="font-semibold text-ink">{title}</p>
      {description && <p className="text-sm text-ink-muted mt-1">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
