export const TOKEN_GENERATOR = Symbol('TOKEN_GENERATOR');

export interface ITokenGenerator {
  generateInvitationToken(): { raw: string; hash: string };
  generateRefreshToken(): { raw: string; hash: string };
  generateOtpCode(): { raw: string; hash: string };
}
