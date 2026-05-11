import type { BayId, BranchId } from '@det/backend-scheduling-domain';
import type { IClock, IIdGenerator, DateTime } from '@det/backend-shared-ddd';

import type { IBayUsagePort } from '../../ports/bay-usage.port';
import type { IBranchUsagePort } from '../../ports/branch-usage.port';
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
