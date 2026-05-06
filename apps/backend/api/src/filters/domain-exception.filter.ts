import { type ArgumentsHost, Catch, type ExceptionFilter } from '@nestjs/common';
import pino from 'pino';

import { DomainError } from '@det/backend/shared/ddd';

interface HttpResponse {
  status(code: number): {
    send(body: DomainErrorResponse): void;
  };
}

interface DomainErrorResponse {
  readonly error: string;
  readonly message: string;
  readonly statusCode: number;
}

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter<DomainError> {
  private readonly _logger: ReturnType<typeof pino> = pino({ name: 'DomainExceptionFilter' });

  catch(exception: DomainError, host: ArgumentsHost): void {
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
