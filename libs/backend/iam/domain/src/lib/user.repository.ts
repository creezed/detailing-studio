import type { PhoneNumber } from '@det/backend/shared/ddd';

import type { Email } from './email.value-object';
import type { UserId } from './user-id';
import type { User } from './user.aggregate';

export interface IUserRepository {
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  findByPhone(phone: PhoneNumber): Promise<User | null>;
  existsByEmail(email: Email): Promise<boolean>;
  countOwners(): Promise<number>;
  save(user: User): Promise<void>;
}
