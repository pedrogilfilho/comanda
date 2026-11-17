// Números de negócio. Mude aqui e os dois apps acompanham.

export const SERVICE_FEE_RATE = 0.1; // taxa de serviço cobrada sobre o subtotal da conta
export const DEFAULT_MIN_GRAMS = 300; // pedido mínimo de carne quando o item não define outro
export const MAX_INSTALLMENTS = 12; // parcelas no crédito
export const DEFAULT_MIN_STOCK_UNITS = 10; // alerta de estoque baixo (unidades)
export const DEFAULT_MIN_STOCK_GRAMS = 10_000; // alerta de estoque baixo (carne, em gramas)
export const ORDER_NOTE_MAX_LENGTH = 120;
export const STOCK_NOTE_MAX_LENGTH = 120;
export const TABLE_IDENTIFIER_MAX_LENGTH = 30;

export const DEFAULT_PASSWORD = '123'; // senha inicial; troca obrigatória no 1º acesso
export const PASSWORD_MIN_LENGTH = 6;
export const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;
export const USER_DELETE_GRACE_DAYS = 30; // exclusão liberada só depois deste prazo desativado
export const RECOVERY_CODE_LENGTH = 8;
export const TWO_FACTOR_CODE_LENGTH = 6;

export const SESSION_HOURS = 8; // um turno de trabalho sem deslogar
