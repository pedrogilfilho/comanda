'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ROLE_LABEL } from '@comanda/shared';
import { useSession } from '@/hooks/useSession';
import { NAV_BY_ROLE, canAccess, homeFor } from '@/constants';
import Skeleton from '@/components/ui/Skeleton';

const headerBg = { background: 'linear-gradient(135deg, #2a1f14 0%, #3d2b18 60%, #4a3520 100%)' };

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
      <span className="text-xl sm:text-2xl" aria-hidden>
        🌿
      </span>
      <span
        className="text-lg sm:text-xl font-bold text-[#faf6ef] truncate"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        Quintal do Roger
      </span>
    </Link>
  );
}

// Esqueleto da tela enquanto o GET /auth/me responde
export function ShellSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: '#faf6ef' }} aria-busy="true" aria-label="Carregando">
      <header style={headerBg}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          <Brand />
          <div
            className="h-8 w-28 rounded-lg animate-pulse"
            style={{ background: 'rgba(255,249,242,0.12)' }}
          />
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-4">
        <Skeleton className="h-9 w-64 max-w-full rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-40 rounded-2xl" />
      </main>
    </div>
  );
}

function Nav() {
  const { user } = useSession();
  const pathname = usePathname();
  const items = NAV_BY_ROLE[user.role];
  if (items.length < 2) return null; // garçom e cozinha têm uma tela só

  return (
    <nav aria-label="Seções" className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
      <ul className="flex gap-2 overflow-x-auto pb-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className="flex-shrink-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className="block py-2.5 px-4 rounded-xl font-semibold text-sm whitespace-nowrap"
                style={{
                  background: active ? '#c45c2a' : '#fff9f2',
                  color: active ? '#faf6ef' : '#2a1f14',
                  border: `1px solid ${active ? '#c45c2a' : '#d9cfc2'}`,
                }}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = user.role === 'ADMIN';
  const allowed = canAccess(pathname, user.role);

  // Área de outro perfil (link antigo, URL digitada): volta para a tela inicial do perfil
  useEffect(() => {
    if (!allowed) router.replace(homeFor(user.role));
  }, [allowed, router, user.role]);

  return (
    <div className="min-h-screen" style={{ background: '#faf6ef' }}>
      <header style={headerBg}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          <Brand />

          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <div className="text-right">
              <p className="text-xs sm:text-sm font-semibold text-[#faf6ef] max-w-[110px] sm:max-w-none truncate">
                {user.name}
              </p>
              <span
                className="text-xs px-2 py-1 rounded-full"
                style={{
                  background: isAdmin ? 'rgba(196,92,42,0.2)' : 'rgba(61,92,58,0.2)',
                  color: isAdmin ? '#e08a5c' : '#9cc298',
                  fontWeight: 600,
                }}
              >
                {ROLE_LABEL[user.role] ?? user.role}
              </span>
            </div>

            <Link
              href="/seguranca"
              title="Segurança da conta"
              className="px-2 sm:px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-[rgba(255,249,242,0.1)]"
              style={{ color: '#c9b39a' }}
            >
              🔒<span className="hidden sm:inline"> Segurança</span>
            </Link>

            <button
              onClick={logout}
              className="px-3 sm:px-4 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-[rgba(255,249,242,0.1)]"
              style={{ color: '#c9b39a' }}
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <Nav />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-8">{allowed ? children : <Skeleton />}</main>
    </div>
  );
}
