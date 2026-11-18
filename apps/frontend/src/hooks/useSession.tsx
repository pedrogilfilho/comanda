'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMe, type LoggedUser } from '@/services/auth';
import { tokenStore } from '@/services/http';
import { setCurrentUserName } from '@/lib/pdf/current-user';

interface SessionValue {
  user: LoggedUser;
  refresh: () => Promise<void>;
  logout: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

type State = { status: 'loading' } | { status: 'ready'; user: LoggedUser };

// Carrega o usuário pelo GET /auth/me (o localStorage guarda só o token, nunca o perfil)
export function SessionProvider({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback: React.ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: 'loading' });

  const logout = useCallback(() => {
    tokenStore.clear();
    setCurrentUserName(undefined);
    router.replace('/login');
  }, [router]);

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) {
      router.replace('/login');
      return;
    }
    try {
      const user = await getMe();
      if (user.needsPasswordChange) {
        router.replace('/change-password');
        return;
      }
      setCurrentUserName(user.name);
      setState({ status: 'ready', user });
    } catch {
      // 401 já mandou para o login; outros erros (rede) também caem lá para não travar na tela de carregamento
      router.replace('/login');
    }
  }, [router]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (state.status === 'loading') return <>{fallback}</>;
  return (
    <SessionContext.Provider value={{ user: state.user, refresh, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession precisa estar dentro de <SessionProvider>');
  return value;
}
