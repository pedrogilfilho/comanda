'use client';

import { inputClass } from './Field';

interface CodeInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  recovery?: boolean; // código de recuperação (XXXX-XXXX) em vez dos 6 dígitos do app
  disabled?: boolean;
  autoFocus?: boolean;
  label?: string;
}

// Campo do código da verificação em 2 etapas
export default function CodeInput({
  id,
  value,
  onChange,
  recovery,
  disabled,
  autoFocus,
  label,
}: CodeInputProps) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      onChange={(e) =>
        onChange(
          recovery
            ? e.target.value
                .toUpperCase()
                .replace(/[^A-Z0-9-]/g, '')
                .slice(0, 9)
            : e.target.value.replace(/\D/g, '').slice(0, 6),
        )
      }
      aria-label={id ? undefined : (label ?? (recovery ? 'Código de recuperação' : 'Código de 6 dígitos'))}
      inputMode={recovery ? 'text' : 'numeric'}
      autoComplete="one-time-code"
      autoCapitalize={recovery ? 'characters' : 'none'}
      autoCorrect="off"
      spellCheck={false}
      placeholder={recovery ? 'XXXX-XXXX' : '000000'}
      maxLength={recovery ? 9 : 6}
      disabled={disabled}
      autoFocus={autoFocus}
      className={inputClass(false, 'min-h-14 text-center !text-xl font-bold tracking-[0.3em] tabular-nums')}
    />
  );
}
