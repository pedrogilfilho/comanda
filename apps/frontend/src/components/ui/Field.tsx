import { forwardRef } from 'react';
import { cx } from '@/lib/cx';

// Estilo único dos campos de formulário. A borda usa ink-muted/70 (cerca de 3:1 contra o branco), o
// mínimo para o contorno de um campo; o hairline dos cartões ficaria em 1,3:1 e o campo sumiria.
export const inputClass = (invalid?: boolean, className?: string) =>
  cx(
    'block w-full min-h-tap rounded-sm border bg-white px-3 text-base text-ink',
    'placeholder:text-ink-muted/70 disabled:bg-surface-2 disabled:text-ink-muted',
    invalid ? 'border-danger' : 'border-ink-muted/70 focus:border-accent-strong',
    className,
  );

interface FieldProps {
  label: React.ReactNode;
  htmlFor: string;
  hint?: React.ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}

// Rótulo visível + campo + dica ou erro logo abaixo
export default function Field({ label, htmlFor, hint, error, optional, className, children }: FieldProps) {
  return (
    <div className={cx('min-w-0', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink mb-1.5">
        {label}
        {optional && <span className="font-normal text-ink-muted"> (opcional)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs text-danger mt-1">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${htmlFor}-hint`} className="text-xs text-ink-muted mt-1">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={inputClass(invalid, className)}
      {...rest}
    />
  );
});

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { invalid, className, children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={inputClass(invalid, cx('pr-8', className))}
      {...rest}
    >
      {children}
    </select>
  );
});
