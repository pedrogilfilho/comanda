import type { Config } from 'tailwindcss';

// Só os tokens do Comanda+ (definidos em src/styles/globals.css). A paleta, a escala de texto e os
// raios padrão do Tailwind ficam de fora de propósito: uma cor ou tamanho fora do sistema nem compila.
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#ffffff',
      bg: token('bg'),
      surface: token('surface'),
      'surface-2': token('surface-2'),
      ink: token('ink'),
      'ink-muted': token('ink-muted'),
      hairline: 'rgb(var(--ink) / 0.14)',
      accent: token('accent'),
      'accent-strong': token('accent-strong'),
      success: token('success'),
      warning: token('warning'),
      danger: token('danger'),
    },
    fontFamily: {
      display: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
      sans: ['system-ui', '-apple-system', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
    },
    // Escala do plano: 28 / 22 / 18 / 16 / 14 / 13. Nada abaixo de 13.
    fontSize: {
      xs: ['13px', '18px'],
      sm: ['14px', '20px'],
      base: ['16px', '24px'],
      lg: ['18px', '26px'],
      xl: ['22px', '28px'],
      '2xl': ['28px', '34px'],
    },
    borderRadius: {
      none: '0',
      sm: '8px',
      md: '12px',
      lg: '16px',
      full: '9999px',
    },
    extend: {
      minHeight: { tap: '44px' },
      minWidth: { tap: '44px' },
    },
  },
  plugins: [],
};

export default config;
