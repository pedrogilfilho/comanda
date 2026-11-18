// Enums e rótulos do domínio. Os dois apps usam estes nomes; nada aqui depende de framework.

export type UserRole = 'ADMIN' | 'GERENTE' | 'GARCOM' | 'COZINHA';
export const USER_ROLES: readonly UserRole[] = ['ADMIN', 'GERENTE', 'GARCOM', 'COZINHA'];
export const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  GERENTE: 'Gerente',
  GARCOM: 'Garçom',
  COZINHA: 'Cozinha',
};

// Perfis obrigados a usar a verificação em 2 etapas
export const TWO_FACTOR_REQUIRED_ROLES: readonly UserRole[] = ['ADMIN', 'GERENTE'];

export type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED' | 'CLOSED';
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Aguardando',
  PREPARING: 'Em preparo',
  READY: 'Pronto',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
  CLOSED: 'Fechado',
};

export type TableStatus = 'FREE' | 'OCCUPIED';

export type PaymentMethod = 'DINHEIRO' | 'PIX' | 'DEBITO' | 'CREDITO';
export const PAYMENT_METHODS: readonly PaymentMethod[] = ['DINHEIRO', 'PIX', 'DEBITO', 'CREDITO'];
export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'Pix',
  DEBITO: 'Débito',
  CREDITO: 'Crédito',
};

export type ProductCategory = 'CARNE' | 'ACOMPANHAMENTO' | 'CALDO' | 'BEBIDA' | 'OUTROS';
export const PRODUCT_CATEGORIES: readonly ProductCategory[] = [
  'CARNE',
  'ACOMPANHAMENTO',
  'CALDO',
  'BEBIDA',
  'OUTROS',
];
export const CATEGORY_LABEL: Record<ProductCategory, string> = {
  CARNE: 'Carnes',
  ACOMPANHAMENTO: 'Acompanhamentos',
  CALDO: 'Caldos',
  BEBIDA: 'Bebidas',
  OUTROS: 'Outros',
};

export type StockMovementType = 'VENDA' | 'ESTORNO' | 'ENTRADA' | 'SAIDA' | 'CONTAGEM';

export type AuditAction =
  | 'USUARIO_CRIADO'
  | 'USUARIO_EXCLUIDO'
  | 'USUARIO_ATIVADO'
  | 'USUARIO_DESATIVADO'
  | 'SENHA_RESETADA'
  | 'DOIS_FATORES_ATIVADO'
  | 'DOIS_FATORES_DESATIVADO'
  | 'DOIS_FATORES_RESETADO'
  | 'MESA_ABERTA'
  | 'PEDIDO_LANCADO'
  | 'PEDIDO_CANCELADO'
  | 'STATUS_ALTERADO'
  | 'CONTA_FECHADA'
  | 'ITEM_CRIADO'
  | 'ITEM_REMOVIDO'
  | 'ITEM_EDITADO'
  | 'ESTOQUE_AJUSTADO'
  | 'INVENTARIO_FEITO'
  | 'CONFIG_ALTERADA';

export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  USUARIO_CRIADO: 'Usuário criado',
  USUARIO_EXCLUIDO: 'Usuário excluído',
  USUARIO_ATIVADO: 'Usuário reativado',
  USUARIO_DESATIVADO: 'Usuário desativado',
  SENHA_RESETADA: 'Senha redefinida',
  DOIS_FATORES_ATIVADO: 'Verificação em 2 etapas ativada',
  DOIS_FATORES_DESATIVADO: 'Verificação em 2 etapas desativada',
  DOIS_FATORES_RESETADO: 'Verificação em 2 etapas removida',
  MESA_ABERTA: 'Mesa aberta',
  PEDIDO_LANCADO: 'Pedido lançado',
  PEDIDO_CANCELADO: 'Pedido cancelado',
  STATUS_ALTERADO: 'Status alterado',
  CONTA_FECHADA: 'Conta fechada',
  ITEM_CRIADO: 'Item adicionado ao cardápio',
  ITEM_REMOVIDO: 'Item removido do cardápio',
  ITEM_EDITADO: 'Item editado no cardápio',
  ESTOQUE_AJUSTADO: 'Estoque ajustado',
  INVENTARIO_FEITO: 'Inventário de estoque',
  CONFIG_ALTERADA: 'Configuração alterada',
};
