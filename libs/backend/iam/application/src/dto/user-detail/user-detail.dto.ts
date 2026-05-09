import type { Role, UserSnapshot, UserStatus } from '@det/backend-iam-domain';

export interface UserDetailDto {
  readonly id: string;
  readonly email: string;
  readonly phone: string;
  readonly fullName: string;
  readonly role: Role;
  readonly branchIds: readonly string[];
  readonly status: UserStatus;
  readonly createdAt: string;
  readonly updatedAt: string | null;
}

export function toUserDetailDto(snapshot: UserSnapshot): UserDetailDto {
  return {
    branchIds: snapshot.branchIds,
    createdAt: snapshot.createdAt,
    email: snapshot.email,
    fullName: snapshot.fullName,
    id: snapshot.id,
    phone: snapshot.phone,
    role: snapshot.role,
    status: snapshot.status,
    updatedAt: snapshot.updatedAt,
  };
}
