import { forwardRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cx } from '@/lib/cx';
import Icon from './Icon';

interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: LucideIcon;
  label: string; // obrigatório: é o nome que o leitor de tela anuncia
  tone?: 'default' | 'onDark';
}

// Botão só com ícone, 44x44 (área de toque)
const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, tone = 'default', className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex items-center justify-center min-h-tap min-w-tap rounded-md transition-colors',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        tone === 'onDark'
          ? 'text-surface/80 hover:text-surface hover:bg-surface/10'
          : 'text-ink-muted hover:text-ink hover:bg-surface-2',
        className,
      )}
      {...rest}
    >
      <Icon icon={icon} size={20} />
    </button>
  );
});

export default IconButton;
