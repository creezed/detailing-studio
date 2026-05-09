import type { Role } from '@det/backend-iam-domain';

export interface LoginResponseDto {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresIn: number;
  readonly user: {
    readonly id: string;
    readonly fullName: string;
    readonly role: Role;
  };
}
