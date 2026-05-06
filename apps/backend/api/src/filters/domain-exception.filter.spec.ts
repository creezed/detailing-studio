import { ApplicationError, DomainError } from '@det/backend/shared/ddd';

import { DomainExceptionFilter } from './domain-exception.filter';

import type { ArgumentsHost } from '@nestjs/common';

class TestDomainError extends DomainError {
  readonly code = 'TEST_ERROR';
  readonly httpStatus = 422;

  constructor() {
    super('Test domain error');
  }
}

class ConflictDomainError extends DomainError {
  readonly code = 'ALREADY_EXISTS';
  readonly httpStatus = 409;

  constructor() {
    super('Resource already exists');
  }
}

class TestApplicationError extends ApplicationError {
  readonly code = 'USER_NOT_FOUND';
  readonly httpStatus = 404;

  constructor() {
    super('User abc not found');
  }
}

function mockArgumentsHost(): { host: ArgumentsHost; sendMock: jest.Mock } {
  const sendMock = jest.fn();
  const statusMock = jest.fn().mockReturnValue({ send: sendMock });
  const getResponse = jest.fn().mockReturnValue({ status: statusMock });

  const host = {
    switchToHttp: () => ({ getResponse }),
  } as unknown as ArgumentsHost;

  return { host, sendMock };
}

describe('DomainExceptionFilter', () => {
  const filter = new DomainExceptionFilter();

  it('should respond with httpStatus and code from DomainError', () => {
    const { host, sendMock } = mockArgumentsHost();

    filter.catch(new TestDomainError(), host);

    expect(sendMock).toHaveBeenCalledWith({
      error: 'TEST_ERROR',
      message: 'Test domain error',
      statusCode: 422,
    });
  });

  it('should use the correct HTTP status code', () => {
    const { host, sendMock } = mockArgumentsHost();

    filter.catch(new ConflictDomainError(), host);

    expect(sendMock).toHaveBeenCalledWith({
      error: 'ALREADY_EXISTS',
      message: 'Resource already exists',
      statusCode: 409,
    });
  });

  it('should handle ApplicationError with proper status and code', () => {
    const { host, sendMock } = mockArgumentsHost();

    filter.catch(new TestApplicationError(), host);

    expect(sendMock).toHaveBeenCalledWith({
      error: 'USER_NOT_FOUND',
      message: 'User abc not found',
      statusCode: 404,
    });
  });
});
