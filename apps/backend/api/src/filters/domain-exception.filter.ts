import { type ArgumentsHost, Catch, type ExceptionFilter } from '@nestjs/common';
import { I18nContext } from 'nestjs-i18n';
import pino from 'pino';

import { ApplicationError, DomainError } from '@det/backend-shared-ddd';

interface HttpResponse {
  status(code: number): {
    send(body: ErrorResponse): void;
  };
}

type CatchableError = ApplicationError | DomainError;

interface ErrorResponse {
  readonly error: string;
  readonly message: string;
  readonly statusCode: number;
}

@Catch(DomainError, ApplicationError)
export class DomainExceptionFilter implements ExceptionFilter<CatchableError> {
  private readonly _logger: ReturnType<typeof pino> = pino({ name: 'DomainExceptionFilter' });

  catch(exception: CatchableError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<HttpResponse>();
    const i18n = I18nContext.current(host);
    const translated = i18n?.translate(exception.code, { defaultValue: exception.message });
    const message = typeof translated === 'string' ? translated : exception.message;

    this._logger.warn(
      {
        code: exception.code,
        httpStatus: exception.httpStatus,
        lang: i18n?.lang,
        name: exception.name,
      },
      exception.message,
    );

    response.status(exception.httpStatus).send({
      error: exception.code,
      message,
      statusCode: exception.httpStatus,
    });
  }
}
