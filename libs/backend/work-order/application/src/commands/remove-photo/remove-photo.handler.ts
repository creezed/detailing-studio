import { Inject } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';

import type { IClock } from '@det/backend-shared-ddd';
import { WorkOrderId } from '@det/backend-work-order-domain';
import type { IWorkOrderRepository } from '@det/backend-work-order-domain';

import { RemovePhotoCommand } from './remove-photo.command';
import { CLOCK, PHOTO_STORAGE_PORT, WORK_ORDER_REPOSITORY } from '../../di/tokens';
import { WorkOrderNotFoundError } from '../../errors/application.errors';

import type { IPhotoStoragePort } from '../../ports/photo-storage.port';
import type { ICommandHandler } from '@nestjs/cqrs';

@CommandHandler(RemovePhotoCommand)
export class RemovePhotoHandler implements ICommandHandler<RemovePhotoCommand, void> {
  constructor(
    @Inject(WORK_ORDER_REPOSITORY) private readonly repo: IWorkOrderRepository,
    @Inject(PHOTO_STORAGE_PORT) private readonly storage: IPhotoStoragePort,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(cmd: RemovePhotoCommand): Promise<void> {
    const wo = await this.repo.findById(WorkOrderId.from(cmd.workOrderId));
    if (!wo) {
      throw new WorkOrderNotFoundError(cmd.workOrderId);
    }

    const snapshot = wo.toSnapshot();
    const photo =
      snapshot.photosBefore.find((p) => p.id === cmd.photoId) ??
      snapshot.photosAfter.find((p) => p.id === cmd.photoId);

    wo.removePhoto(cmd.photoId, this.clock.now());
    await this.repo.save(wo);

    if (photo) {
      const key = new URL(photo.url).pathname.slice(1);
      await this.storage.delete(key).catch(() => {
        /* best-effort S3 cleanup */
      });
    }
  }
}
