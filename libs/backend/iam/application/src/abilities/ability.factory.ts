import { AbilityBuilder, createMongoAbility, subject } from '@casl/ability';
import { Injectable } from '@nestjs/common';

import { Role } from '@det/backend-iam-domain';

import type { ForcedSubject, MongoAbility } from '@casl/ability';

export type AppAction =
  | 'manage'
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'invite'
  | 'post'
  | 'cancel'
  | 'approve'
  | 'reject'
  | 'anonymize'
  | 'export-data';

export type AppSubjectName =
  | 'User'
  | 'Invitation'
  | 'Appointment'
  | 'WorkOrder'
  | 'Client'
  | 'Service'
  | 'ServiceCategory'
  | 'Sku'
  | 'Supplier'
  | 'Receipt'
  | 'Stock'
  | 'Adjustment'
  | 'Transfer'
  | 'StockTaking'
  | 'StockMovement'
  | 'Vehicle'
  | 'Consent'
  | 'VisitHistory'
  | 'PiiAccessLog'
  | 'Branch'
  | 'Bay'
  | 'BranchSchedule'
  | 'MasterSchedule'
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
      can(['read', 'create', 'update'], 'Branch', { branchId: { $in: branchIds } });
      can(['read', 'create', 'update'], 'Bay', { branchId: { $in: branchIds } });
      can(['read', 'update'], 'BranchSchedule', { branchId: { $in: branchIds } });
      can(['read', 'update'], 'MasterSchedule', { branchId: { $in: branchIds } });
      can('manage', 'Appointment', { branchId: { $in: branchIds } });
      can(['read', 'create', 'update'], 'Client');
      can(['read', 'create', 'update'], 'Vehicle');
      can(['read', 'create', 'delete'], 'Consent');
      can('read', 'VisitHistory');
      cannot('anonymize', 'Client');
      cannot('export-data', 'Client');
      cannot('read', 'PiiAccessLog');
      can('read', 'Service');
      can('read', 'ServiceCategory');
      can('invite', 'User', { role: Role.MASTER });
      can('create', 'Invitation', { role: Role.MASTER });

      can(['read', 'create', 'update'], 'Sku');
      can(['read', 'create', 'update'], 'Supplier');
      can(['read', 'create', 'update'], 'Receipt', { branchId: { $in: branchIds } });
      can('post', 'Receipt', { branchId: { $in: branchIds } });
      can('cancel', 'Receipt', { branchId: { $in: branchIds } });
      can(['read', 'create'], 'Adjustment', { branchId: { $in: branchIds } });
      cannot('approve', 'Adjustment');
      cannot('reject', 'Adjustment');
      can(['read', 'create'], 'Transfer', { branchId: { $in: branchIds } });
      can('post', 'Transfer', { branchId: { $in: branchIds } });
      can(['read', 'create'], 'StockTaking', { branchId: { $in: branchIds } });
      can('post', 'StockTaking', { branchId: { $in: branchIds } });
      can('cancel', 'StockTaking', { branchId: { $in: branchIds } });
      can('read', 'Stock', { branchId: { $in: branchIds } });
      can('read', 'StockMovement', { branchId: { $in: branchIds } });

      cannot('read', 'all', ['cost', 'averageCost', 'unitCost']);
    }

    if (user.role === Role.MASTER) {
      can('read', 'Appointment', { masterId: user.id });
      can('update', 'WorkOrder', { masterId: user.id });
      can('read', 'Client', { masterId: user.id });
      can('read', 'Vehicle', { masterId: user.id });
      can('read', 'VisitHistory', { masterId: user.id });
      can('read', 'Service');
      can('read', 'ServiceCategory');

      can('read', 'Sku', { branchId: { $in: branchIds } });
      can('read', 'Stock', { branchId: { $in: branchIds } });
      cannot('read', 'all', ['cost', 'averageCost', 'unitCost']);
    }

    if (user.role === Role.CLIENT) {
      can('manage', 'Appointment', { clientId: user.id });
      can('read', 'Client', { clientId: user.id });
      can('read', 'Vehicle', { clientId: user.id });
      can('read', 'VisitHistory', { clientId: user.id });
      can('export-data', 'Client', { clientId: user.id });
      can('read', 'Service');
      can('read', 'ServiceCategory');
      can('read', 'Branch');
    }

    return build();
  }
}
