import { forwardRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { cx } from '@/lib/cx';
import Icon from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm';

const VARIANT: Record<ButtonVariant, string> = {
  // accent é o único botão preenchido
  primary: 'bg-accent-strong text-white hover:bg-accent-strong/90 active:bg-accent-strong/80',
  secondary: 'bg-surface text-ink border border-hairline hover:bg-surface-2 active:bg-surface-2/70',
  ghost: 'bg-transparent text-ink-muted hover:bg-surface-2 hover:text-ink active:bg-surface-2/70',
  danger: 'bg-surface text-danger border border-danger/30 hover:bg-danger/5 active:bg-danger/10',
};

// 44px de altura no celular; "sm" encolhe só a partir de 640px (lista densa no computador)
const SIZE: Record<ButtonSize, string> = {
  md: 'min-h-tap px-4 text-base gap-2',
  sm: 'min-h-tap sm:min-h-9 px-3 text-sm gap-1.5',
};

interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
}

// Mesmo visual para <Link> e <a> (ex.: <Link className={buttonClass({ variant: 'secondary' })}>)
export function buttonClass({ variant = 'primary', size = 'md', block, className }: ButtonStyleOptions = {}) {
  return cx(
    'inline-flex items-center justify-center rounded-md font-semibold transition-colors',
    'disabled:opacity-50 disabled:cursor-not-allowed select-none',
    VARIANT[variant],
    SIZE[size],
    block && 'w-full',
    className,
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, ButtonStyleOptions {
  icon?: LucideIcon;
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, block, className, icon, loading, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass({ variant, size, block, className })}
      {...rest}
    >
      {loading ? (
        <Icon icon={Loader2} size={size === 'sm' ? 16 : 18} className="animate-spin" />
      ) : (
        icon && <Icon icon={icon} size={size === 'sm' ? 16 : 18} />
      )}
      {children}
    </button>
  );
});

export default Button;
