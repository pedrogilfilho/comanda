import { HttpException, HttpStatus } from '@nestjs/common';
import type { ApiErrorBody, ApiErrorCode } from '@comanda/shared';

// Erro da aplicação com um código estável, para o frontend decidir sem ler a mensagem.
export class AppError extends HttpException {
  constructor(
    status: HttpStatus,
    public readonly code: ApiErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super({ statusCode: status, code, message, details } satisfies ApiErrorBody, status);
  }

  static badRequest(code: ApiErrorCode, message: string, details?: unknown) {
    return new AppError(HttpStatus.BAD_REQUEST, code, message, details);
  }

  static unauthorized(code: ApiErrorCode, message: string) {
    return new AppError(HttpStatus.UNAUTHORIZED, code, message);
  }

  static forbidden(message: string, code: ApiErrorCode = 'FORBIDDEN') {
    return new AppError(HttpStatus.FORBIDDEN, code, message);
  }

  static notFound(message: string) {
    return new AppError(HttpStatus.NOT_FOUND, 'NOT_FOUND', message);
  }

  static conflict(code: ApiErrorCode, message: string) {
    return new AppError(HttpStatus.CONFLICT, code, message);
  }
}
