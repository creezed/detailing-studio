import { type ArgumentsHost, Catch, type ExceptionFilter } from '@nestjs/common';
import pino from 'pino';

import { ApplicationError, DomainError } from '@det/backend/shared/ddd';

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

    this._logger.warn(
      { code: exception.code, httpStatus: exception.httpStatus, name: exception.name },
      exception.message,
    );

    response.status(exception.httpStatus).send({
      error: exception.code,
      message: exception.message,
      statusCode: exception.httpStatus,
    });
  }
}
