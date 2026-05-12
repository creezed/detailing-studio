import { Module } from '@nestjs/common';

import {
  CATALOG_NORM_PORT,
  CATALOG_SKU_PORT,
  CRM_CLIENT_PORT,
  CRM_VEHICLE_PORT,
  IAM_USER_PORT,
  INVENTORY_STOCK_PORT,
  PHOTO_STORAGE_PORT,
  SCHEDULING_APPOINTMENT_PORT,
} from '@det/backend-work-order-application';
import { WorkOrderInfrastructureModule } from '@det/backend-work-order-infrastructure';

import { WoCatalogNormPortAdapter } from '../acl/wo-catalog-norm-port.adapter';
import { WoCatalogSkuPortAdapter } from '../acl/wo-catalog-sku-port.adapter';
import { WoCrmClientPortAdapter } from '../acl/wo-crm-client-port.adapter';
import { WoCrmVehiclePortAdapter } from '../acl/wo-crm-vehicle-port.adapter';
import { WoIamUserPortAdapter } from '../acl/wo-iam-user-port.adapter';
import { WoInventoryStockPortAdapter } from '../acl/wo-inventory-stock-port.adapter';
import { WoPhotoStoragePortAdapter } from '../acl/wo-photo-storage-port.adapter';
import { WoSchedulingAppointmentPortAdapter } from '../acl/wo-scheduling-appointment-port.adapter';

import type { Provider } from '@nestjs/common';

const WO_ACL_PROVIDERS: readonly Provider[] = [
  WoIamUserPortAdapter,
  WoCrmClientPortAdapter,
  WoCrmVehiclePortAdapter,
  WoCatalogNormPortAdapter,
  WoCatalogSkuPortAdapter,
  WoSchedulingAppointmentPortAdapter,
  WoInventoryStockPortAdapter,
  WoPhotoStoragePortAdapter,
  { provide: IAM_USER_PORT, useExisting: WoIamUserPortAdapter },
  { provide: CRM_CLIENT_PORT, useExisting: WoCrmClientPortAdapter },
  { provide: CRM_VEHICLE_PORT, useExisting: WoCrmVehiclePortAdapter },
  { provide: CATALOG_NORM_PORT, useExisting: WoCatalogNormPortAdapter },
  { provide: CATALOG_SKU_PORT, useExisting: WoCatalogSkuPortAdapter },
  { provide: SCHEDULING_APPOINTMENT_PORT, useExisting: WoSchedulingAppointmentPortAdapter },
  { provide: INVENTORY_STOCK_PORT, useExisting: WoInventoryStockPortAdapter },
  { provide: PHOTO_STORAGE_PORT, useExisting: WoPhotoStoragePortAdapter },
];

@Module({
  exports: [WorkOrderInfrastructureModule],
  imports: [WorkOrderInfrastructureModule.register(WO_ACL_PROVIDERS)],
})
export class ApiWorkOrderModule {}
