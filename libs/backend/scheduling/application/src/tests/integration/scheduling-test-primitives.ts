import type { BayId, BranchId } from '@det/backend-scheduling-domain';
import type { IClock, IIdGenerator, DateTime } from '@det/backend-shared-ddd';
import type { ClientId, ServiceId, VehicleId } from '@det/shared-types';

import { VehicleNotFoundError } from '../../errors/application.errors';

import type { IBayUsagePort } from '../../ports/bay-usage.port';
import type { IBranchUsagePort } from '../../ports/branch-usage.port';
import type {
  CatalogServiceReadModel,
  ICatalogServicePort,
} from '../../ports/catalog-service.port';
import type { CrmVehicleReadModel, ICrmVehiclePort } from '../../ports/crm-vehicle.port';
import type { IIamUserPort, IamUserReadModel } from '../../ports/iam-user.port';

export class FixedClock implements IClock {
  constructor(private readonly current: DateTime) {}

  now(): DateTime {
    return this.current;
  }
}

export class QueueIdGenerator implements IIdGenerator {
  private ids: string[] = [];

  reset(ids: readonly string[]): void {
    this.ids = [...ids];
  }

  generate(): string {
    const id = this.ids.shift();
    if (id === undefined) {
      throw new Error('No test id available');
    }

    return id;
  }
}

export class InMemoryBranchUsagePort implements IBranchUsagePort {
  private readonly activeBranchIds = new Set<string>();

  setHasActiveAppointments(branchId: string, value: boolean): void {
    if (value) {
      this.activeBranchIds.add(branchId);
      return;
    }
    this.activeBranchIds.delete(branchId);
  }

  hasActiveAppointments(branchId: BranchId): Promise<boolean> {
    return Promise.resolve(this.activeBranchIds.has(branchId));
  }
}

export class InMemoryBayUsagePort implements IBayUsagePort {
  private readonly futureBayIds = new Set<string>();

  setHasFutureAppointments(bayId: string, value: boolean): void {
    if (value) {
      this.futureBayIds.add(bayId);
      return;
    }
    this.futureBayIds.delete(bayId);
  }

  hasFutureAppointments(bayId: BayId): Promise<boolean> {
    return Promise.resolve(this.futureBayIds.has(bayId));
  }
}

export class InMemoryIamUserPort implements IIamUserPort {
  private readonly users = new Map<string, IamUserReadModel>();

  setUser(user: IamUserReadModel): void {
    this.users.set(user.id, user);
  }

  clear(): void {
    this.users.clear();
  }

  getById(userId: string): Promise<IamUserReadModel | null> {
    return Promise.resolve(this.users.get(userId) ?? null);
  }
}

export class InMemoryCatalogServicePort implements ICatalogServicePort {
  private readonly services = new Map<string, CatalogServiceReadModel>();

  setService(service: CatalogServiceReadModel): void {
    this.services.set(service.id, service);
  }

  clear(): void {
    this.services.clear();
  }

  getMany(serviceIds: readonly ServiceId[]): Promise<readonly CatalogServiceReadModel[]> {
    return Promise.resolve(
      serviceIds
        .map((serviceId) => this.services.get(serviceId))
        .filter((service): service is CatalogServiceReadModel => service !== undefined),
    );
  }
}

export class InMemoryCrmVehiclePort implements ICrmVehiclePort {
  private readonly vehicles = new Map<string, CrmVehicleReadModel>();

  setVehicle(vehicle: CrmVehicleReadModel): void {
    this.vehicles.set(vehicle.id, vehicle);
  }

  clear(): void {
    this.vehicles.clear();
  }

  getOrThrow(clientId: ClientId, vehicleId: VehicleId): Promise<CrmVehicleReadModel> {
    const vehicle = this.vehicles.get(vehicleId);
    if (vehicle === undefined || vehicle.clientId !== clientId) {
      throw new VehicleNotFoundError(vehicleId);
    }

    return Promise.resolve(vehicle);
  }
}
