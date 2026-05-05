export class LoginByPhoneOtpCommand {
  constructor(
    public readonly phone: string,
    public readonly code: string,
    public readonly deviceFingerprint: string,
  ) {}
}
