import { AbilityBuilder, createMongoAbility, subject } from '@casl/ability';
import { Injectable } from '@nestjs/common';

import { Role } from '@det/backend/iam/domain';

import type { ForcedSubject, MongoAbility } from '@casl/ability';

export type AppAction = 'manage' | 'create' | 'read' | 'update' | 'delete' | 'invite';

export type AppSubjectName =
  | 'User'
  | 'Invitation'
  | 'Appointment'
  | 'WorkOrder'
  | 'Client'
  | 'Service'
  | 'ServiceCategory'
  | 'Sku'
  | 'Receipt'
  | 'Stock'
  | 'Adjustment'
  | 'all';

type AppResourceSubjectName = Exclude<AppSubjectName, 'all'>;

export interface AbilityUser {
  readonly id: string;
  readonly role: Role;
  readonly branchIds: readonly string[];
}

export interface AppSubjectData {
  readonly id?: string;
  readonly role?: Role;
  readonly branchId?: string;
  readonly masterId?: string;
  readonly clientId?: string;
}

type AppResourceSubject = {
  readonly [TSubject in AppResourceSubjectName]: AppSubjectData & ForcedSubject<TSubject>;
}[AppResourceSubjectName];

export type AppSubject = AppSubjectName | AppResourceSubject;

export type AppAbility = MongoAbility<[AppAction, AppSubject]>;

export const appSubject = <TSubject extends AppResourceSubjectName>(
  subjectName: TSubject,
  data: AppSubjectData = {},
): AppSubjectData & ForcedSubject<TSubject> => subject(subjectName, data);

@Injectable()
export class AbilityFactory {
  createForUser(user: AbilityUser): AppAbility {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);
    const branchIds = [...user.branchIds];

    can('read', 'User', { id: user.id });
    can('update', 'User', { id: user.id });

    if (user.role === Role.OWNER) {
      can('manage', 'all');
    }

    if (user.role === Role.MANAGER) {
      can('manage', 'Appointment', { branchId: { $in: branchIds } });
      can('manage', 'Client', { branchId: { $in: branchIds } });
      can('manage', 'Receipt', { branchId: { $in: branchIds } });
      can('read', 'Service');
      can('read', 'ServiceCategory');
      can('invite', 'User', { role: Role.MASTER });
      can('create', 'Invitation', { role: Role.MASTER });
      cannot('read', 'all', ['cost', 'averageCost', 'unitCost']);
    }

    if (user.role === Role.MASTER) {
      can('read', 'Appointment', { masterId: user.id });
      can('update', 'WorkOrder', { masterId: user.id });
      can('read', 'Service');
      can('read', 'ServiceCategory');
    }

    if (user.role === Role.CLIENT) {
      can('manage', 'Appointment', { clientId: user.id });
      can('read', 'Service');
      can('read', 'ServiceCategory');
    }

    return build();
  }
}
