import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import '@/styles/globals.css';
import { THEME_BOOT_SCRIPT } from '@/lib/theme';

export const metadata: Metadata = {
  title: 'Comanda+',
  description: 'Sistema de gestão de restaurante',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#2a1f14',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Aplica o tema escuro antes de pintar, para não piscar claro */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
