export class RefreshTokensCommand {
  constructor(
    public readonly currentRefreshToken: string,
    public readonly deviceFingerprint: string,
  ) {}
}
