import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';

import {
  InvalidCredentialsError,
  RefreshTokenReuseError,
  SessionExpiredError,
  SessionNotFoundError,
} from '@det/backend/iam/application';

interface HttpResponse {
  status(code: number): {
    send(body: HttpErrorResponse): void;
  };
}

interface HttpErrorResponse {
  readonly error: string;
  readonly message: string;
  readonly statusCode: number;
}

type IamHttpError =
  | InvalidCredentialsError
  | RefreshTokenReuseError
  | SessionExpiredError
  | SessionNotFoundError;

@Catch(InvalidCredentialsError, RefreshTokenReuseError, SessionExpiredError, SessionNotFoundError)
export class IamApplicationExceptionFilter implements ExceptionFilter<IamHttpError> {
  catch(exception: IamHttpError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<HttpResponse>();
    const statusCode =
      exception instanceof InvalidCredentialsError ? HttpStatus.FORBIDDEN : HttpStatus.UNAUTHORIZED;

    response.status(statusCode).send({
      error: statusCode === HttpStatus.FORBIDDEN ? 'Forbidden' : 'Unauthorized',
      message: exception.message,
      statusCode,
    });
  }
}
