// Hora do login atual: o "iat" do token que o navegador já guarda (sem rota nova no backend)
export function tokenIssuedAt(token: string | null): Date | null {
  try {
    const part = token?.split('.')[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    const iat = (JSON.parse(json) as { iat?: unknown }).iat;
    return typeof iat === 'number' && Number.isFinite(iat) ? new Date(iat * 1000) : null;
  } catch {
    return null;
  }
}

// "ativo há 5 min", "ativo há 2h15"
export function activeFor(from: Date, now: number): string {
  const min = Math.max(0, Math.floor((now - from.getTime()) / 60_000));
  if (min < 60) return `ativo há ${min} min`;
  return `ativo há ${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`;
}
