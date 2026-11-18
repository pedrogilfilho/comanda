import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Response } from 'express';
import type { ApiErrorBody, ApiErrorCode } from '@comanda/shared';
import { AppError } from './app-error';

// Toda resposta de erro sai no mesmo formato: { statusCode, code, message, details? }.
@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Http');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const body = this.toBody(exception);
    if (body.statusCode >= 500)
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    res.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ApiErrorBody {
    if (exception instanceof AppError) {
      return {
        statusCode: exception.getStatus(),
        code: exception.code,
        message: exception.message,
        details: exception.details,
      };
    }
    if (exception instanceof ThrottlerException) {
      return {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        code: 'RATE_LIMITED',
        message: 'Muitas tentativas. Aguarde um minuto.',
      };
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      // ValidationPipe devolve { message: string[] }
      const messages =
        typeof raw === 'object' && raw && 'message' in raw ? (raw as { message: unknown }).message : raw;
      const message = Array.isArray(messages) ? messages.join('; ') : String(messages ?? exception.message);
      return {
        statusCode: status,
        code: this.codeFor(status),
        message,
        details: Array.isArray(messages) ? messages : undefined,
      };
    }
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL',
      message: 'Erro interno. Tente de novo.',
    };
  }

  private codeFor(status: number): ApiErrorCode {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'VALIDATION';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      default:
        return 'INTERNAL';
    }
  }
}
