'use client';

import { SessionProvider } from '@/hooks/useSession';
import AppShell, { ShellSkeleton } from '@/components/layout/AppShell';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider fallback={<ShellSkeleton />}>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
