import { cx } from '@/lib/cx';

interface CardProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'div' | 'article' | 'section' | 'li';
  padding?: 'none' | 'sm' | 'md';
  tone?: 'default' | 'accent' | 'success' | 'warning' | 'danger';
}

const PADDING = { none: '', sm: 'p-3', md: 'p-4 sm:p-5' };
const TONE = {
  default: 'border-hairline',
  accent: 'border-accent',
  success: 'border-success',
  warning: 'border-warning/60',
  danger: 'border-danger/50',
};

// Cartão único do app: superfície clara, borda fina, raio 12
export default function Card({
  as: Tag = 'div',
  padding = 'md',
  tone = 'default',
  className,
  ...rest
}: CardProps) {
  return (
    <Tag className={cx('rounded-md border bg-surface', TONE[tone], PADDING[padding], className)} {...rest} />
  );
}
