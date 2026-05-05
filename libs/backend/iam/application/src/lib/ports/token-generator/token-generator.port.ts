export const TOKEN_GENERATOR = Symbol('TOKEN_GENERATOR');

export interface ITokenGenerator {
  generateInvitationToken(): { raw: string; hash: string };
}
