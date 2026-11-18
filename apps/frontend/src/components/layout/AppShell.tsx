'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, ShieldCheck } from 'lucide-react';
import { ROLE_LABEL } from '@comanda/shared';
import { useSession } from '@/hooks/useSession';
import { NAV_BY_ROLE, canAccess, homeFor } from '@/constants';
import Skeleton from '@/components/ui/Skeleton';
import Tabs from '@/components/ui/Tabs';
import Icon from '@/components/ui/Icon';

function Brand() {
  return (
    <Link href="/" className="flex min-h-tap items-center min-w-0 rounded-sm">
      <span className="font-display text-lg sm:text-xl font-bold text-surface truncate">
        Quintal do Roger
      </span>
    </Link>
  );
}

const headerAction =
  'inline-flex items-center gap-2 min-h-tap min-w-tap justify-center rounded-md px-2 sm:px-3 text-sm font-medium text-surface/80 hover:text-surface hover:bg-surface/10 transition-colors';

// Esqueleto da tela enquanto o GET /auth/me responde
export function ShellSkeleton() {
  return (
    <div className="min-h-screen bg-bg" aria-busy="true" aria-label="Carregando">
      <header className="bg-ink">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 py-2">
          <Brand />
          <div className="h-8 w-28 animate-pulse rounded-sm bg-surface/10" />
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-4 px-4 sm:px-6 py-6 sm:py-8">
        <Skeleton className="h-9 w-64 max-w-full rounded-sm" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-md" />
          ))}
        </div>
        <Skeleton className="h-40 rounded-md" />
      </main>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const allowed = canAccess(pathname, user.role);
  const nav = NAV_BY_ROLE[user.role];
  const active = nav.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))?.href ?? '';

  // Área de outro perfil (link antigo, URL digitada): volta para a tela inicial do perfil
  useEffect(() => {
    if (!allowed) router.replace(homeFor(user.role));
  }, [allowed, router, user.role]);

  return (
    <div className="min-h-screen bg-bg">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-3 focus:text-ink"
      >
        Pular para o conteúdo
      </a>
      <header className="bg-ink">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 py-2">
          <Brand />
          <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
            <div className="mr-1 text-right leading-tight">
              <p className="max-w-[120px] truncate text-sm font-semibold text-surface sm:max-w-none">
                {user.name}
              </p>
              <p className="text-xs text-surface/70">{ROLE_LABEL[user.role] ?? user.role}</p>
            </div>
            <Link href="/seguranca" className={headerAction} aria-label="Segurança da conta">
              <Icon icon={ShieldCheck} />
              <span className="hidden sm:inline">Segurança</span>
            </Link>
            <button type="button" onClick={logout} className={headerAction} aria-label="Sair">
              <Icon icon={LogOut} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Garçom e cozinha têm uma tela só: sem menu */}
      {nav.length > 1 && (
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-4 sm:pt-6">
          <Tabs
            label="Seções"
            active={active}
            items={nav.map((i) => ({ key: i.href, label: i.label, href: i.href }))}
          />
        </div>
      )}

      <main id="conteudo" className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
        {allowed ? children : <Skeleton />}
      </main>
    </div>
  );
}
