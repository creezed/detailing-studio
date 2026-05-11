import { Inject } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';

import type { IClock, IIdGenerator } from '@det/backend-shared-ddd';
import { WorkOrderId, PhotoId, PhotoType } from '@det/backend-work-order-domain';
import type { IWorkOrderRepository, PhotoRef } from '@det/backend-work-order-domain';
import type { UserId } from '@det/shared-types';

import { AddPhotoCommand } from './add-photo.command';
import { CLOCK, ID_GENERATOR, PHOTO_STORAGE_PORT, WORK_ORDER_REPOSITORY } from '../../di/tokens';
import { WorkOrderNotFoundError } from '../../errors/application.errors';

import type { IPhotoStoragePort } from '../../ports/photo-storage.port';
import type { ICommandHandler } from '@nestjs/cqrs';

@CommandHandler(AddPhotoCommand)
export class AddPhotoHandler implements ICommandHandler<AddPhotoCommand, string> {
  constructor(
    @Inject(WORK_ORDER_REPOSITORY) private readonly repo: IWorkOrderRepository,
    @Inject(PHOTO_STORAGE_PORT) private readonly storage: IPhotoStoragePort,
    @Inject(CLOCK) private readonly clock: IClock,
    @Inject(ID_GENERATOR) private readonly idGen: IIdGenerator,
  ) {}

  async execute(cmd: AddPhotoCommand): Promise<string> {
    const wo = await this.repo.findById(WorkOrderId.from(cmd.workOrderId));
    if (!wo) {
      throw new WorkOrderNotFoundError(cmd.workOrderId);
    }

    const photoId = PhotoId.generate(this.idGen);
    const key = `work-orders/${cmd.workOrderId}/${cmd.type.toLowerCase()}/${photoId}.jpg`;

    const result = await this.storage.upload({
      buffer: cmd.file,
      key,
      mime: cmd.mime,
    });

    const now = this.clock.now();
    const photoRef: PhotoRef = {
      id: photoId,
      mime: cmd.mime,
      sizeBytes: result.sizeBytes,
      thumbnailUrl: result.thumbnailUrl,
      type: cmd.type === 'BEFORE' ? PhotoType.BEFORE : PhotoType.AFTER,
      uploadedAt: now,
      uploadedBy: cmd.uploadedBy as UserId,
      url: result.url,
    };

    if (cmd.type === 'BEFORE') {
      wo.addPhotoBefore(photoRef, now);
    } else {
      wo.addPhotoAfter(photoRef, now);
    }

    await this.repo.save(wo);
    return photoId;
  }
}
