import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { codeForStatus, ERR, ErrorCode } from './error-codes';

interface ResolvedError {
  statusCode: number;
  code: ErrorCode | string;
  message: string;
  /** Bir nechta xato (masalan, forma validatsiyasi) — hammasi bir javobda. */
  errors?: string[];
}

/**
 * Yagona xato formati (docs/04-API-CONVENTIONS.md §4):
 * { statusCode, code, message, errors?, path, timestamp }
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, code, message, errors } =
      this.resolveException(exception);

    const body = {
      statusCode,
      code,
      message,
      ...(errors?.length ? { errors } : {}),
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    const line = `[${request.method}] ${request.url} → ${statusCode} ${code}: ${message}`;

    // 5xx — haqiqiy xato: stack bilan. 4xx — mijoz xatosi: qisqa, stack'siz (shovqin kam).
    if (statusCode >= 500) {
      this.logger.error(
        line,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(line);
    }

    response.status(statusCode).json(body);
  }

  private resolveException(exception: unknown): ResolvedError {
    if (exception instanceof HttpException) {
      return this.resolveHttpException(exception);
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.resolvePrismaError(exception);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        code: ERR.VALIDATION_ERROR,
        message: 'Validation error: invalid data format',
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ERR.INTERNAL_ERROR,
      message: 'Internal server error',
    };
  }

  private resolveHttpException(exception: HttpException): ResolvedError {
    const statusCode = exception.getStatus();
    const res = exception.getResponse();

    if (typeof res === 'string') {
      return { statusCode, code: codeForStatus(statusCode), message: res };
    }

    const payload = res as {
      message?: string | string[];
      code?: string;
      errors?: string[];
    };

    // class-validator: message — array; biz esa HAMMASINI qaytaramiz (errors[]),
    // message'da birinchisi (orqaga moslik).
    const messages = Array.isArray(payload.message)
      ? payload.message
      : payload.message
        ? [payload.message]
        : [exception.message];

    const isValidation =
      Array.isArray(payload.message) && statusCode === HttpStatus.BAD_REQUEST;

    return {
      statusCode,
      code:
        payload.code ??
        (isValidation ? ERR.VALIDATION_ERROR : codeForStatus(statusCode)),
      message: messages[0],
      errors:
        (payload.errors ?? (isValidation || messages.length > 1))
          ? (payload.errors ?? messages)
          : undefined,
    };
  }

  private resolvePrismaError(
    error: Prisma.PrismaClientKnownRequestError,
  ): ResolvedError {
    switch (error.code) {
      // Unique constraint violated
      case 'P2002': {
        const fields = (error.meta?.target as string[])?.join(', ') ?? 'field';
        return {
          statusCode: HttpStatus.CONFLICT,
          code: ERR.ALREADY_EXISTS,
          message: `Already exists: ${fields} must be unique`,
        };
      }
      // Record not found
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          code: ERR.NOT_FOUND,
          message: 'Record not found',
        };
      // Foreign key constraint failed
      case 'P2003':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          code: ERR.RELATED_NOT_FOUND,
          message: 'Related record not found (foreign key constraint)',
        };
      // Required field missing
      case 'P2011':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          code: ERR.VALIDATION_ERROR,
          message: 'Required field is missing',
        };
      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          code: ERR.DATABASE_ERROR,
          message: `Database error: ${error.code}`,
        };
    }
  }
}
