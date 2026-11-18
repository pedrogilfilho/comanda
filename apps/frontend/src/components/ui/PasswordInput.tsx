'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { inputClass } from './Field';
import IconButton from './IconButton';

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  invalid?: boolean;
}

// Campo de senha com botão para mostrar ou ocultar o que foi digitado
export default function PasswordInput({ invalid, className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        aria-invalid={invalid || undefined}
        className={inputClass(invalid, `pr-12 ${className ?? ''}`)}
      />
      <IconButton
        icon={visible ? EyeOff : Eye}
        label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        onClick={() => setVisible((v) => !v)}
        className="absolute right-0 top-1/2 -translate-y-1/2"
      />
    </div>
  );
}
