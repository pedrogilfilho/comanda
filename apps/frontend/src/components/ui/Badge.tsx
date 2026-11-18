import type { LucideIcon } from 'lucide-react';
import { cx } from '@/lib/cx';
import Icon from './Icon';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const TONE: Record<BadgeTone, string> = {
  neutral: 'bg-surface-2 text-ink-muted',
  accent: 'bg-accent/10 text-accent-strong',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
};

interface BadgeProps {
  tone?: BadgeTone;
  icon?: LucideIcon;
  className?: string;
  title?: string;
  children: React.ReactNode;
}

export default function Badge({ tone = 'neutral', icon, className, title, children }: BadgeProps) {
  return (
    <span
      title={title}
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        TONE[tone],
        className,
      )}
    >
      {icon && <Icon icon={icon} size={14} />}
      {children}
    </span>
  );
}
