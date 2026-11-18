import type { UserRole } from '@comanda/shared';

// Cozinha e salão atualizam sozinhos neste intervalo
export const POLL_MS = 15_000;

export interface NavItem {
  href: string;
  label: string;
}

const ITEMS = {
  mesas: { href: '/mesas', label: 'Mesas' },
  cozinha: { href: '/cozinha', label: 'Fila da cozinha' },
  contas: { href: '/contas', label: 'Contas fechadas' },
  relatorios: { href: '/relatorios', label: 'Relatórios' },
  usuarios: { href: '/admin/usuarios', label: 'Usuários' },
  cardapio: { href: '/admin/cardapio', label: 'Cardápio' },
  estoque: { href: '/admin/estoque', label: 'Estoque' },
  logs: { href: '/admin/logs', label: 'Logs' },
} satisfies Record<string, NavItem>;

// Menu de cada perfil; o primeiro item é a tela inicial
export const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  ADMIN: [
    ITEMS.mesas,
    ITEMS.estoque,
    ITEMS.cardapio,
    ITEMS.contas,
    ITEMS.relatorios,
    ITEMS.usuarios,
    ITEMS.logs,
  ],
  GERENTE: [ITEMS.mesas, ITEMS.contas, ITEMS.relatorios],
  GARCOM: [ITEMS.mesas],
  COZINHA: [ITEMS.cozinha],
};

export const homeFor = (role: UserRole) => NAV_BY_ROLE[role][0].href;

// Quem pode abrir cada área (o backend confere de novo em cada rota)
const ROUTE_ROLES: { prefix: string; roles: readonly UserRole[] }[] = [
  { prefix: '/admin', roles: ['ADMIN'] },
  { prefix: '/mesas', roles: ['GARCOM', 'GERENTE', 'ADMIN'] },
  { prefix: '/cozinha', roles: ['COZINHA', 'GERENTE', 'ADMIN'] },
  { prefix: '/contas', roles: ['GERENTE', 'ADMIN'] },
  { prefix: '/relatorios', roles: ['GERENTE', 'ADMIN'] },
];

export function canAccess(pathname: string, role: UserRole): boolean {
  const rule = ROUTE_ROLES.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`));
  return !rule || rule.roles.includes(role);
}
