import type { RegisterClientConsentInput } from '../register-regular-client/register-regular-client.command';

export class RegisterGuestClientCommand {
  constructor(
    public readonly lastName: string,
    public readonly firstName: string,
    public readonly middleName: string | null,
    public readonly phone: string,
    public readonly email: string | null,
    public readonly birthDate: string | null,
    public readonly source: string | null,
    public readonly comment: string,
    public readonly consents: readonly RegisterClientConsentInput[],
  ) {}
}
