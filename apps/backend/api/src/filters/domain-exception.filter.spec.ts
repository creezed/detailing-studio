import { I18nContext } from 'nestjs-i18n';

import { ApplicationError, DomainError } from '@det/backend-shared-ddd';

import { DomainExceptionFilter } from './domain-exception.filter';

import type { ArgumentsHost } from '@nestjs/common';

jest.mock('nestjs-i18n', () => ({
  ...jest.requireActual('nestjs-i18n'),
  I18nContext: { current: jest.fn() },
}));

class TestDomainError extends DomainError {
  readonly code = 'TEST_ERROR';
  readonly httpStatus = 422;

  constructor() {
    super('Test domain error');
  }
}

class TestApplicationError extends ApplicationError {
  readonly code = 'USER_NOT_FOUND';
  readonly httpStatus = 404;

  constructor() {
    super('User abc not found');
  }
}

function mockHost(): { host: ArgumentsHost; sendMock: jest.Mock } {
  const sendMock = jest.fn();
  const statusMock = jest.fn().mockReturnValue({ send: sendMock });
  const getResponse = jest.fn().mockReturnValue({ status: statusMock });

  const host = {
    switchToHttp: () => ({ getResponse }),
  } as unknown as ArgumentsHost;

  return { host, sendMock };
}

function mockI18n(translations: Record<string, string>, lang = 'ru'): void {
  (I18nContext.current as jest.Mock).mockReturnValue({
    lang,
    translate: (key: string, opts?: { defaultValue?: string }) =>
      translations[key] ?? opts?.defaultValue ?? key,
  });
}

describe('DomainExceptionFilter', () => {
  const filter = new DomainExceptionFilter();

  afterEach(() => jest.clearAllMocks());

  it('should translate error message using I18nContext', () => {
    mockI18n({ USER_NOT_FOUND: 'Пользователь не найден' }, 'ru');
    const { host, sendMock } = mockHost();

    filter.catch(new TestApplicationError(), host);

    expect(sendMock).toHaveBeenCalledWith({
      error: 'USER_NOT_FOUND',
      message: 'Пользователь не найден',
      statusCode: 404,
    });
  });

  it('should translate to EN locale', () => {
    mockI18n({ USER_NOT_FOUND: 'User not found' }, 'en');
    const { host, sendMock } = mockHost();

    filter.catch(new TestApplicationError(), host);

    expect(sendMock).toHaveBeenCalledWith({
      error: 'USER_NOT_FOUND',
      message: 'User not found',
      statusCode: 404,
    });
  });

  it('should fall back to original message when code has no translation', () => {
    mockI18n({}, 'ru');
    const { host, sendMock } = mockHost();

    filter.catch(new TestDomainError(), host);

    expect(sendMock).toHaveBeenCalledWith({
      error: 'TEST_ERROR',
      message: 'Test domain error',
      statusCode: 422,
    });
  });

  it('should fall back to original message when I18nContext is unavailable', () => {
    (I18nContext.current as jest.Mock).mockReturnValue(null);
    const { host, sendMock } = mockHost();

    filter.catch(new TestApplicationError(), host);

    expect(sendMock).toHaveBeenCalledWith({
      error: 'USER_NOT_FOUND',
      message: 'User abc not found',
      statusCode: 404,
    });
  });
});
