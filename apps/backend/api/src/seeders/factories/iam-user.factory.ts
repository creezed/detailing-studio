import { fakerRU } from '@faker-js/faker';
import { Factory } from '@mikro-orm/seeder';

import { Role, UserStatus } from '@det/backend-iam-domain';
import { IamUserSchema } from '@det/backend-iam-infrastructure';

import type { Faker } from '@faker-js/faker';

export class IamUserFactory extends Factory<IamUserSchema> {
  readonly model = IamUserSchema;
  protected readonly faker: Faker = fakerRU;

  protected definition(): Partial<IamUserSchema> {
    const now = new Date();

    return {
      branchIds: [],
      createdAt: now,
      email: this.faker.internet.email().toLowerCase(),
      fullName: [
        this.faker.person.lastName(),
        this.faker.person.firstName(),
        this.faker.person.middleName(),
      ].join(' '),
      id: this.faker.string.uuid(),
      passwordHash: null,
      phone: `+7${this.faker.string.numeric(10)}`,
      roleSet: [Role.MASTER],
      status: UserStatus.ACTIVE,
      updatedAt: now,
    };
  }
}
