import { Module, type Provider } from '@nestjs/common';

import {
  CATALOG_SERVICE_PORT,
  CRM_VEHICLE_PORT,
  IAM_USER_PORT,
} from '@det/backend-scheduling-application';
import { SchedulingInfrastructureModule } from '@det/backend-scheduling-infrastructure';

import { CatalogServicePortAdapter } from '../acl/catalog-service-port.adapter';
import { CrmVehiclePortAdapter } from '../acl/crm-vehicle-port.adapter';
import { IamUserPortAdapter } from '../acl/iam-user-port.adapter';

const SCHEDULING_ACL_PROVIDERS: readonly Provider[] = [
  CatalogServicePortAdapter,
  CrmVehiclePortAdapter,
  IamUserPortAdapter,
  {
    provide: CATALOG_SERVICE_PORT,
    useExisting: CatalogServicePortAdapter,
  },
  {
    provide: CRM_VEHICLE_PORT,
    useExisting: CrmVehiclePortAdapter,
  },
  {
    provide: IAM_USER_PORT,
    useExisting: IamUserPortAdapter,
  },
];

@Module({
  exports: [SchedulingInfrastructureModule],
  imports: [SchedulingInfrastructureModule.register(SCHEDULING_ACL_PROVIDERS)],
})
export class ApiSchedulingModule {}
