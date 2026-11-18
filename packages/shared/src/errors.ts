// Códigos que a API devolve junto com a mensagem, para o frontend decidir sem ler texto.
export type ApiErrorCode =
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CHALLENGE_EXPIRED'
  | 'TWO_FACTOR_LOCKED'
  | 'TWO_FACTOR_INVALID'
  | 'PASSWORD_CHANGE_REQUIRED'
  | 'USER_INACTIVE'
  | 'TABLE_NOT_OPEN'
  | 'TABLE_ALREADY_OPEN'
  | 'STOCK_INSUFFICIENT'
  | 'ORDERS_IN_KITCHEN'
  | 'INVALID_TRANSITION'
  | 'ORDER_CHANGED'
  | 'PAYMENT_MISMATCH'
  | 'RATE_LIMITED'
  | 'INTERNAL';

export interface ApiErrorBody {
  statusCode: number;
  code: ApiErrorCode;
  message: string;
  details?: unknown;
}
