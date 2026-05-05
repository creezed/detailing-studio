import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';

import { InvalidCredentialsError } from '@det/backend/iam/application';

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

@Catch(InvalidCredentialsError)
export class IamApplicationExceptionFilter implements ExceptionFilter<InvalidCredentialsError> {
  catch(exception: InvalidCredentialsError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<HttpResponse>();

    response.status(HttpStatus.FORBIDDEN).send({
      error: 'Forbidden',
      message: exception.message,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}
