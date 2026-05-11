import { Entity, Enum, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';

import { PhotoType } from '@det/backend-work-order-domain';

import { WoWorkOrderSchema } from './wo-work-order.schema';

@Entity({ tableName: 'wo_photo' })
export class WoPhotoSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @ManyToOne(() => WoWorkOrderSchema, { fieldName: 'work_order_id' })
  declare workOrder: WoWorkOrderSchema;

  @Enum({ items: () => PhotoType, nativeEnumName: 'wo_photo_type', type: 'text' })
  declare type: PhotoType;

  @Property({ type: 'text' })
  declare url: string;

  @Property({ fieldName: 'thumbnail_url', type: 'text' })
  declare thumbnailUrl: string;

  @Property({ type: 'text' })
  declare mime: string;

  @Property({ fieldName: 'size_bytes', type: 'integer' })
  declare sizeBytes: number;

  @Property({ fieldName: 'uploaded_by', type: 'uuid' })
  declare uploadedBy: string;

  @Property({ fieldName: 'uploaded_at', type: 'timestamptz' })
  declare uploadedAt: Date;
}
