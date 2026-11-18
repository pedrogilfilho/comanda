// Formatos que a API devolve/recebe. Enums e rótulos do domínio ficam no @comanda/shared.
import type { OrderStatus, PaymentMethod, ProductCategory, TableStatus, UserRole } from '@comanda/shared';

export type { OrderStatus, PaymentMethod, ProductCategory, TableStatus, UserRole };

// auth
export interface LoggedUser {
  id: string;
  username: string;
  name: string;
  email: string | null;
  role: UserRole;
  needsPasswordChange: boolean;
  twoFactorEnabled: boolean;
}

export interface AuthSession {
  status: 'OK';
  accessToken: string;
  user: LoggedUser;
  recoveryCodesLeft?: number; // só quando entrou com um código de recuperação
}

// auth
// O login pode pedir a 2ª etapa (código do app) ou a configuração obrigatória (Admin/Gerente)
export type LoginResponse =
  | AuthSession
  | { status: 'TWO_FACTOR_REQUIRED'; challengeToken: string }
  | { status: 'TWO_FACTOR_SETUP_REQUIRED'; challengeToken: string };

export interface TwoFactorSetup {
  qrCode: string; // imagem (data URL)
  secret: string; // chave para digitar à mão
  otpauthUrl: string;
}

// auth
export interface TwoFactorStatus {
  enabled: boolean;
  required: boolean;
  recoveryCodesLeft: number;
}

// tables
export interface Table {
  id: string;
  identifier: string; // número ou nome (ex: 5, A3, Varanda)
  capacity: number;
  status: TableStatus;
  clientName: string | null;
  openedBy: string | null; // quem abriu a mesa
  openedAt: string;
  subtotal: number; // pedidos ativos, sem taxa (centavos)
  serviceFee: number;
  total: number; // com taxa: é o que a mesa paga
  inKitchen: number; // pedidos aguardando ou em preparo (impedem fechar a conta)
  undelivered: number; // pedidos ainda não entregues (inclui os prontos)
}

export interface Payment {
  method: PaymentMethod;
  amount: number; // centavos
  installments: number; // parcelas (só crédito; demais = 1)
}

// orders
export interface OrderItemView {
  id: string;
  productId: string;
  productName: string;
  isMeat: boolean;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes: string | null;
}

export interface OrderView {
  id: string;
  status: OrderStatus;
  createdAt: string;
  items: OrderItemView[];
  subtotal: number;
}

// orders
export interface TableAccount {
  orders: OrderView[];
  subtotal: number;
  serviceFee: number;
  total: number;
}

export interface KitchenOrder {
  id: string;
  tableIdentifier: string;
  clientName: string | null;
  status: OrderStatus;
  createdAt: string;
  startedAt: string | null;
  readyAt: string | null;
  items: { productName: string; quantity: number; isMeat: boolean; notes: string | null }[];
}

// orders
export type OrderStatusChange = Exclude<OrderStatus, 'PENDING' | 'CLOSED'>;

// products
export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number; // centavos por unidade (não carne)
  pricePerKg: number | null; // centavos por kg (carne)
  minGrams: number | null; // pedido mínimo em gramas (carne)
  category: ProductCategory;
  isMeat: boolean;
  available: boolean;
  stock: number; // gramas (carne) ou unidades
  minStock: number;
  lowStock: boolean;
}

export type StockAdjustment = 'ENTRADA' | 'SAIDA' | 'CONTAGEM';

// users
export interface AppUser {
  id: string;
  username: string;
  name: string;
  email: string | null;
  role: UserRole;
  needsPasswordChange: boolean;
  active: boolean;
  deactivatedAt: string | null;
  deletableAt: string | null; // a partir de quando pode ser excluído
  twoFactorEnabled: boolean;
  twoFactorRequired: boolean; // Admin e Gerente
  createdAt: string;
}

// reports
export type PaymentSummary = { method: PaymentMethod; count: number; amount: number }[];

export interface Reports {
  from: string;
  to: string;
  revenue: { subtotal: number; serviceFee: number; total: number; accounts: number };
  topEmployees: { name: string; username: string; subtotal: number; orders: number }[];
  topBeers: { name: string; quantity: number; subtotal: number }[];
  topMeats: { name: string; grams: number; subtotal: number }[];
  byCategory: { category: string; subtotal: number }[];
  byTable: { tableIdentifier: string; total: number; accounts: number; averageTicket: number }[]; // com taxa
  averageTicket: number;
  byPayment: PaymentSummary;
}

// reports
export interface ClosedAccount {
  id: string;
  tableIdentifier: string;
  clientName: string | null;
  openedAt: string;
  closedAt: string;
  closedBy: string;
  openedBy: string | null; // quem abriu a mesa (garçom da conta)
  subtotal: number;
  serviceFee: number;
  total: number;
  divergent: boolean;
  payments: Payment[];
  orders: {
    id: string;
    createdAt: string;
    waiter: string;
    subtotal: number;
    items: {
      productName: string;
      isMeat: boolean;
      quantity: number;
      unitPrice: number;
      subtotal: number;
      notes: string | null;
    }[];
  }[];
}

export interface ClosedAccountsResult {
  accounts: ClosedAccount[];
  summary: { count: number; subtotal: number; serviceFee: number; total: number; byPayment: PaymentSummary };
}

// reports
export interface AuditLog {
  id: string;
  action: string;
  actor: string;
  details: string;
  createdAt: string;
}
