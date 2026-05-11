import {
  CATALOG_SERVICE_PORT,
  CRM_VEHICLE_PORT,
  IAM_USER_PORT,
  SchedulingApplicationModule,
} from '@det/backend-scheduling-application';
import { SchedulingInfrastructureModule } from '@det/backend-scheduling-infrastructure';

import { ApiSchedulingModule } from './scheduling.module';

import type { DynamicModule, Provider } from '@nestjs/common';

describe('ApiSchedulingModule', () => {
  it('wires SchedulingApplicationModule through infrastructure register', () => {
    const metadata = Reflect.getMetadata(
      'imports',
      ApiSchedulingModule,
    ) as readonly DynamicModule[];
    const schedulingModule = metadata.find(
      (entry) => entry.module === SchedulingInfrastructureModule,
    );

    expect(schedulingModule).toBeDefined();

    const imports = schedulingModule?.imports ?? [];
    const applicationModule = imports.find(
      (entry): entry is DynamicModule =>
        isDynamicModule(entry) && entry.module === SchedulingApplicationModule,
    );

    expect(applicationModule).toBeDefined();
    expect(providerTokens(applicationModule?.providers ?? [])).toEqual(
      expect.arrayContaining([CATALOG_SERVICE_PORT, CRM_VEHICLE_PORT, IAM_USER_PORT]),
    );
  });
});

function isDynamicModule(value: unknown): value is DynamicModule {
  return typeof value === 'object' && value !== null && 'module' in value;
}

function providerTokens(providers: readonly Provider[]): readonly unknown[] {
  return providers.map((provider) =>
    typeof provider === 'function' ? provider : provider.provide,
  );
}
