import { DomainError } from './domain-error';

class CannotCloseWorkOrderError extends DomainError {
  readonly code = 'CANNOT_CLOSE_WORK_ORDER';
  readonly httpStatus = 422;

  constructor() {
    super('Cannot close WorkOrder');
  }
}

describe('DomainError', () => {
  it('stores typed domain error metadata', () => {
    const error = new CannotCloseWorkOrderError();

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('CannotCloseWorkOrderError');
    expect(error.message).toBe('Cannot close WorkOrder');
    expect(error.code).toBe('CANNOT_CLOSE_WORK_ORDER');
    expect(error.httpStatus).toBe(422);
  });
});
