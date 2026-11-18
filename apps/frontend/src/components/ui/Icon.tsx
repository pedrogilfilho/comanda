import type { LucideIcon } from 'lucide-react';
import { cx } from '@/lib/cx';

interface IconProps {
  icon: LucideIcon;
  size?: number;
  className?: string;
  label?: string; // sem label o ícone é decorativo (aria-hidden)
}

// Todos os ícones do app vêm do lucide-react, com o mesmo traço
export default function Icon({ icon: Glyph, size = 18, className, label }: IconProps) {
  return (
    <Glyph
      size={size}
      strokeWidth={1.75}
      className={cx('flex-shrink-0', className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    />
  );
}
