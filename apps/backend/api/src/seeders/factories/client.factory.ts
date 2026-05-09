import { fakerRU } from '@faker-js/faker';
import { Factory } from '@mikro-orm/seeder';

import { Role, UserStatus } from '@det/backend-iam-domain';
import { IamUserSchema } from '@det/backend-iam-infrastructure';

import type { Faker } from '@faker-js/faker';
import type { EntityData } from '@mikro-orm/core';

export interface ClientFactoryInput {
  readonly branchIds?: readonly string[];
  readonly email?: string;
  readonly id?: string;
  readonly index?: number;
  readonly phone?: string;
}

export class ClientFactory extends Factory<IamUserSchema, ClientFactoryInput> {
  readonly model = IamUserSchema;
  protected readonly faker: Faker = fakerRU;

  protected definition(input: ClientFactoryInput = {}): EntityData<IamUserSchema> {
    const now = new Date();
    const index = input.index ?? this.faker.number.int({ max: 999_999, min: 1 });
    const normalizedIndex = String(index).padStart(6, '0');

    return {
      branchIds: [...(input.branchIds ?? [])],
      createdAt: now,
      email: input.email ?? `client${normalizedIndex}@demo.studio.local`,
      fullName: [
        this.faker.person.lastName(),
        this.faker.person.firstName(),
        this.faker.person.middleName(),
      ].join(' '),
      id: input.id ?? this.faker.string.uuid(),
      passwordHash: null,
      phone: input.phone ?? `+79${this.faker.string.numeric(9)}`,
      roleSet: [Role.CLIENT],
      status: UserStatus.ACTIVE,
      updatedAt: now,
      version: 1,
    };
  }

  generateAddress(): string {
    return `${this.faker.location.city()}, ${this.faker.location.streetAddress()}`;
  }

  generateLicensePlate(): string {
    const letters = ['А', 'В', 'Е', 'К', 'М', 'Н', 'О', 'Р', 'С', 'Т', 'У', 'Х'];
    const letter = () => this.faker.helpers.arrayElement(letters);
    const number = this.faker.string.numeric(3);
    const region = this.faker.helpers.arrayElement(['77', '78', '97', '99', '177', '197', '199']);

    return `${letter()}${number}${letter()}${letter()}${region}`;
  }
}
