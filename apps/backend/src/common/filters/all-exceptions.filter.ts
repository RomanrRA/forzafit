import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
}

/**
 * Глобальный обработчик исключений. Централизованно:
 *  - логирует все необработанные ошибки со структурным контекстом
 *    (метод, путь, статус, userId), 5xx — со стеком;
 *  - отдаёт клиенту единообразный JSON;
 *  - в production не раскрывает внутренние сообщения 5xx-ошибок.
 *
 * Точка для будущей интеграции внешнего мониторинга (Sentry/GlitchTip):
 * достаточно добавить отправку в ветке `status >= 500`.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');
  private readonly isProduction = process.env.NODE_ENV === 'production';

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const { error, message } = this.extractMessage(exception, status);

    const userId =
      (request.user as { userId?: string } | undefined)?.userId ?? null;

    const logContext = `${request.method} ${request.url} ${status} user=${
      userId ?? 'anon'
    }`;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(
        `${logContext} — ${this.stringify(message)}`,
        stack,
      );
    } else {
      // 4xx — ожидаемые клиентские ошибки, не шумим в production.
      this.logger.debug(`${logContext} — ${this.stringify(message)}`);
    }

    const body: ErrorBody = {
      statusCode: status,
      error,
      // В production не раскрываем детали внутренних ошибок.
      message:
        status >= HttpStatus.INTERNAL_SERVER_ERROR && this.isProduction
          ? 'Внутренняя ошибка сервера'
          : message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(body);
  }

  private extractMessage(
    exception: unknown,
    status: number,
  ): { error: string; message: string | string[] } {
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        return { error: exception.name, message: res };
      }
      const obj = res as { error?: string; message?: string | string[] };
      return {
        error: obj.error ?? exception.name,
        message: obj.message ?? exception.message,
      };
    }
    return {
      error: 'InternalServerError',
      message:
        exception instanceof Error ? exception.message : 'Unknown error',
    };
  }

  private stringify(message: string | string[]): string {
    return Array.isArray(message) ? message.join('; ') : message;
  }
}
