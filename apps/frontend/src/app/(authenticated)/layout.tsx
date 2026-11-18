'use client'

import Link from 'next/link'
import { ROLE_LABEL } from '@comanda/shared'
import { SessionProvider, useSession } from '@/hooks/useSession'

const headerBg = { background: 'linear-gradient(135deg, #2a1f14 0%, #3d2b18 60%, #4a3520 100%)' }

function Brand() {
  return (
    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
      <span className="text-xl sm:text-2xl" aria-hidden>🌿</span>
      <span className="text-lg sm:text-xl font-bold text-[#faf6ef] truncate" style={{ fontFamily: 'Georgia, serif' }}>
        Quintal do Roger
      </span>
    </div>
  )
}

// Esqueleto da tela enquanto o GET /auth/me responde
function ShellSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: '#faf6ef' }} aria-busy="true" aria-label="Carregando">
      <header style={headerBg}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          <Brand />
          <div className="h-8 w-28 rounded-lg animate-pulse" style={{ background: 'rgba(255,249,242,0.12)' }} />
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-4">
        <div className="h-9 w-64 max-w-full rounded-lg animate-pulse" style={{ background: '#f0e8dd' }} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: '#f0e8dd' }} />)}
        </div>
        <div className="h-40 rounded-2xl animate-pulse" style={{ background: '#f0e8dd' }} />
      </main>
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useSession()
  const isAdmin = user.role === 'ADMIN'

  return (
    <div className="min-h-screen" style={{ background: '#faf6ef' }}>
      <header style={headerBg}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          <Brand />

          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <div className="text-right">
              <p className="text-xs sm:text-sm font-semibold text-[#faf6ef] max-w-[110px] sm:max-w-none truncate">{user.name}</p>
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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-8">{children}</main>
    </div>
  )
}

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider fallback={<ShellSkeleton />}>
      <Shell>{children}</Shell>
    </SessionProvider>
  )
}
