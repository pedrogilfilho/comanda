import { Search } from 'lucide-react';
import { cx } from '@/lib/cx';
import { inputClass } from './Field';
import Icon from './Icon';

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string; // vira o aria-label (a lupa já diz que é busca)
}

export default function SearchInput({ label, className, ...rest }: SearchInputProps) {
  return (
    <div className={cx('relative', className)}>
      <Icon
        icon={Search}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
      />
      <input type="search" aria-label={label} className={inputClass(false, 'pl-10')} {...rest} />
    </div>
  );
}
