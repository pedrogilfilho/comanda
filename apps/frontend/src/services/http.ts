import type { ApiErrorBody, ApiErrorCode } from '@comanda/shared';
import { API_URL } from '@/config/env';

const TOKEN_KEY = 'token';

// Código extra só do cliente: o servidor não respondeu
export type ClientErrorCode = ApiErrorCode | 'NETWORK';

// Erro de qualquer chamada à API, com o código estável que o backend manda
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ClientErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const isApiError = (e: unknown, code?: ClientErrorCode): e is ApiError =>
  e instanceof ApiError && (code === undefined || e.code === code);

// Mensagem para mostrar ao usuário, venha o erro de onde vier
export function errorMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError) return e.message || fallback;
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

export const tokenStore = {
  get: (): string | null => {
    try {
      return typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* navegador sem storage: a sessão dura até recarregar */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('user'); // resquício das versões antigas
    } catch {
      /* nada a limpar */
    }
  },
};

// Sessão expirada ou usuário desativado: volta para o login (uma vez só, mesmo com várias chamadas falhando juntas)
let redirecting = false;
function goToLogin() {
  tokenStore.clear();
  if (typeof window === 'undefined' || redirecting) return;
  if (window.location.pathname.startsWith('/login')) return;
  redirecting = true;
  window.location.href = '/login';
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface RequestOptions {
  body?: unknown;
  // false = rota pública (login e 2ª etapa): 401 é erro de credencial, não sessão vencida
  auth?: boolean;
  signal?: AbortSignal;
}

async function parseError(res: Response): Promise<ApiError> {
  const data = (await res.json().catch(() => null)) as Partial<ApiErrorBody> | null;
  const code = (data?.code as ApiErrorCode) ?? (res.status === 429 ? 'RATE_LIMITED' : 'INTERNAL');
  const raw = data?.message as unknown;
  const message = Array.isArray(raw) ? raw.join('. ') : typeof raw === 'string' ? raw : `Erro ${res.status}`;
  return new ApiError(res.status, code, message, data?.details);
}

export async function request<T>(method: Method, endpoint: string, opts: RequestOptions = {}): Promise<T> {
  const auth = opts.auth ?? true;
  const token = auth ? tokenStore.get() : null;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers: {
        ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e;
    throw new ApiError(0, 'NETWORK', 'Sem conexão com o servidor. Confira a internet e tente de novo.');
  }

  if (!res.ok) {
    const error = await parseError(res);
    if (auth && res.status === 401) goToLogin();
    if (auth && error.code === 'PASSWORD_CHANGE_REQUIRED' && typeof window !== 'undefined') {
      window.location.href = '/change-password';
    }
    throw error;
  }

  if (res.status === 204) return undefined as T;
  return (await res.json().catch(() => undefined)) as T;
}

export const http = {
  get: <T>(endpoint: string, opts?: Omit<RequestOptions, 'body'>) => request<T>('GET', endpoint, opts),
  post: <T>(endpoint: string, body?: unknown, opts?: Omit<RequestOptions, 'body'>) =>
    request<T>('POST', endpoint, { ...opts, body }),
  patch: <T>(endpoint: string, body?: unknown, opts?: Omit<RequestOptions, 'body'>) =>
    request<T>('PATCH', endpoint, { ...opts, body }),
  delete: <T>(endpoint: string, opts?: Omit<RequestOptions, 'body'>) => request<T>('DELETE', endpoint, opts),
};
