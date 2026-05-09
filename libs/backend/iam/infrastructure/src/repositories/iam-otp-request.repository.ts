import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import { HASH_FN } from '@det/backend-iam-application';
import type {
  IOtpRequestRepository,
  OtpPurpose,
  OtpRequest,
  OtpRequestId,
} from '@det/backend-iam-domain';
import { OtpRequestStatus } from '@det/backend-iam-domain';
import type { PhoneNumber } from '@det/backend-shared-ddd';
import { OutboxService } from '@det/backend-shared-outbox';

import {
  mapIamOtpRequestToDomain,
  mapIamOtpRequestToPersistence,
} from '../mappers/iam-otp-request.mapper';
import { IamOtpRequestSchema } from '../persistence/iam-otp-request.schema';

@Injectable()
export class IamOtpRequestRepository implements IOtpRequestRepository {
  constructor(
    private readonly em: EntityManager,
    private readonly outbox: OutboxService,
    @Inject(HASH_FN) private readonly hashFn: (value: string) => string,
  ) {}

  async findById(id: OtpRequestId): Promise<OtpRequest | null> {
    const schema = await this.em.findOne(IamOtpRequestSchema, { id });

    return schema ? this.toDomain(schema) : null;
  }

  async findPendingByPhoneAndPurpose(
    phone: PhoneNumber,
    purpose: OtpPurpose,
  ): Promise<OtpRequest | null> {
    const schema = await this.em.findOne(
      IamOtpRequestSchema,
      {
        phone: phone.toString(),
        purpose,
        status: OtpRequestStatus.PENDING,
      },
      { orderBy: { createdAt: 'desc' } },
    );

    return schema ? this.toDomain(schema) : null;
  }

  async save(otpRequest: OtpRequest): Promise<void> {
    const existing = await this.em.findOne(IamOtpRequestSchema, { id: otpRequest.id });
    const persisted = mapIamOtpRequestToPersistence(otpRequest, existing);
    const events = otpRequest.pullDomainEvents();

    for (const event of events) {
      await this.outbox.append(event, this.em);
    }

    await this.em.persist(persisted).flush();
  }

  private toDomain(schema: IamOtpRequestSchema): OtpRequest {
    return mapIamOtpRequestToDomain(
      schema,
      (rawCode, storedHash) => this.hashFn(rawCode) === storedHash,
    );
  }
}
