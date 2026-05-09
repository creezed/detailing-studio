import type { Role, UserSnapshot, UserStatus } from '@det/backend-iam-domain';

export interface CurrentUserDto {
  readonly id: string;
  readonly email: string;
  readonly phone: string;
  readonly fullName: string;
  readonly role: Role;
  readonly status: UserStatus;
}

export function toCurrentUserDto(snapshot: UserSnapshot): CurrentUserDto {
  return {
    email: snapshot.email,
    fullName: snapshot.fullName,
    id: snapshot.id,
    phone: snapshot.phone,
    role: snapshot.role,
    status: snapshot.status,
  };
}
