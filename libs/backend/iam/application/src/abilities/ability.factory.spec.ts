import { Role } from '@det/backend-iam-domain';

import { AbilityFactory, appSubject, type AbilityUser } from './ability.factory';

const OWNER_ID = '00000000-0000-0000-0000-000000000001';
const MANAGER_ID = '00000000-0000-0000-0000-000000000002';
const MASTER_ID = '00000000-0000-0000-0000-000000000003';
const CLIENT_ID = '00000000-0000-0000-0000-000000000004';
const BRANCH_ID = '00000000-0000-0000-0000-000000000101';
const OTHER_BRANCH_ID = '00000000-0000-0000-0000-000000000102';
const OTHER_USER_ID = '00000000-0000-0000-0000-000000000999';

const factory = new AbilityFactory();

const user = (role: Role, overrides: Partial<AbilityUser> = {}): AbilityUser => ({
  branchIds: [BRANCH_ID],
  id: roleUserId(role),
  role,
  ...overrides,
});

describe('AbilityFactory', () => {
  describe('OWNER', () => {
    it('can manage all subjects', () => {
      const ability = factory.createForUser(user(Role.OWNER));

      expect(ability.can('manage', 'all')).toBe(true);
      expect(ability.can('manage', 'User')).toBe(true);
      expect(ability.can('manage', 'Appointment')).toBe(true);
      expect(ability.can('manage', 'WorkOrder')).toBe(true);
      expect(ability.can('manage', 'Stock')).toBe(true);
      expect(ability.can('manage', 'Adjustment')).toBe(true);
    });

    it('can manage all Inventory subjects', () => {
      const ability = factory.createForUser(user(Role.OWNER));

      expect(ability.can('manage', 'Sku')).toBe(true);
      expect(ability.can('manage', 'Supplier')).toBe(true);
      expect(ability.can('manage', 'Receipt')).toBe(true);
      expect(ability.can('approve', 'Adjustment')).toBe(true);
      expect(ability.can('reject', 'Adjustment')).toBe(true);
      expect(ability.can('manage', 'Transfer')).toBe(true);
      expect(ability.can('manage', 'StockTaking')).toBe(true);
      expect(ability.can('manage', 'StockMovement')).toBe(true);
    });
  });

  describe('MANAGER', () => {
    it('can manage Appointment in assigned branches', () => {
      const ability = factory.createForUser(user(Role.MANAGER));

      expect(ability.can('manage', appSubject('Appointment', { branchId: BRANCH_ID }))).toBe(true);
      expect(ability.can('manage', appSubject('Appointment', { branchId: OTHER_BRANCH_ID }))).toBe(
        false,
      );
    });

    it('can read/create/update Client, Vehicle, Consent, VisitHistory', () => {
      const ability = factory.createForUser(user(Role.MANAGER));

      expect(ability.can('read', 'Client')).toBe(true);
      expect(ability.can('create', 'Client')).toBe(true);
      expect(ability.can('update', 'Client')).toBe(true);
      expect(ability.can('delete', 'Client')).toBe(false);
      expect(ability.can('read', 'Vehicle')).toBe(true);
      expect(ability.can('create', 'Vehicle')).toBe(true);
      expect(ability.can('update', 'Vehicle')).toBe(true);
      expect(ability.can('read', 'Consent')).toBe(true);
      expect(ability.can('create', 'Consent')).toBe(true);
      expect(ability.can('delete', 'Consent')).toBe(true);
      expect(ability.can('read', 'VisitHistory')).toBe(true);
    });

    it('cannot anonymize Client or read PiiAccessLog', () => {
      const ability = factory.createForUser(user(Role.MANAGER));

      expect(ability.can('anonymize', 'Client')).toBe(false);
      expect(ability.can('export-data', 'Client')).toBe(false);
      expect(ability.can('read', 'PiiAccessLog')).toBe(false);
    });

    it('cannot read cost fields', () => {
      const ability = factory.createForUser(user(Role.MANAGER));

      expect(ability.can('read', 'Receipt', 'cost')).toBe(false);
      expect(ability.can('read', 'Sku', 'averageCost')).toBe(false);
      expect(ability.can('read', 'Stock', 'unitCost')).toBe(false);
    });

    it('cannot manage User but can invite MASTER', () => {
      const ability = factory.createForUser(user(Role.MANAGER));

      expect(ability.can('manage', 'User')).toBe(false);
      expect(ability.can('invite', appSubject('User', { role: Role.MASTER }))).toBe(true);
      expect(ability.can('invite', appSubject('User', { role: Role.MANAGER }))).toBe(false);
      expect(ability.can('create', appSubject('Invitation', { role: Role.MASTER }))).toBe(true);
      expect(ability.can('create', appSubject('Invitation', { role: Role.MANAGER }))).toBe(false);
    });

    it('cannot manage Stock or Adjustment', () => {
      const ability = factory.createForUser(user(Role.MANAGER));

      expect(ability.can('manage', 'Stock')).toBe(false);
      expect(ability.can('manage', 'Adjustment')).toBe(false);
    });

    it('can read/create/update Sku and Supplier (no branch constraint)', () => {
      const ability = factory.createForUser(user(Role.MANAGER));

      expect(ability.can('read', 'Sku')).toBe(true);
      expect(ability.can('create', 'Sku')).toBe(true);
      expect(ability.can('update', 'Sku')).toBe(true);
      expect(ability.can('delete', 'Sku')).toBe(false);
      expect(ability.can('read', 'Supplier')).toBe(true);
      expect(ability.can('create', 'Supplier')).toBe(true);
      expect(ability.can('update', 'Supplier')).toBe(true);
      expect(ability.can('delete', 'Supplier')).toBe(false);
    });

    it('can create/post/cancel Receipt in own branch', () => {
      const ability = factory.createForUser(user(Role.MANAGER));

      expect(ability.can('create', appSubject('Receipt', { branchId: BRANCH_ID }))).toBe(true);
      expect(ability.can('post', appSubject('Receipt', { branchId: BRANCH_ID }))).toBe(true);
      expect(ability.can('cancel', appSubject('Receipt', { branchId: BRANCH_ID }))).toBe(true);
      expect(ability.can('create', appSubject('Receipt', { branchId: OTHER_BRANCH_ID }))).toBe(
        false,
      );
    });

    it('can create Adjustment in own branch but cannot approve/reject', () => {
      const ability = factory.createForUser(user(Role.MANAGER));

      expect(ability.can('create', appSubject('Adjustment', { branchId: BRANCH_ID }))).toBe(true);
      expect(ability.can('read', appSubject('Adjustment', { branchId: BRANCH_ID }))).toBe(true);
      expect(ability.can('approve', 'Adjustment')).toBe(false);
      expect(ability.can('reject', 'Adjustment')).toBe(false);
    });

    it('can create/post Transfer in own branch', () => {
      const ability = factory.createForUser(user(Role.MANAGER));

      expect(ability.can('create', appSubject('Transfer', { branchId: BRANCH_ID }))).toBe(true);
      expect(ability.can('post', appSubject('Transfer', { branchId: BRANCH_ID }))).toBe(true);
      expect(ability.can('create', appSubject('Transfer', { branchId: OTHER_BRANCH_ID }))).toBe(
        false,
      );
    });

    it('can create/post/cancel StockTaking in own branch', () => {
      const ability = factory.createForUser(user(Role.MANAGER));

      expect(ability.can('create', appSubject('StockTaking', { branchId: BRANCH_ID }))).toBe(true);
      expect(ability.can('post', appSubject('StockTaking', { branchId: BRANCH_ID }))).toBe(true);
      expect(ability.can('cancel', appSubject('StockTaking', { branchId: BRANCH_ID }))).toBe(true);
      expect(ability.can('create', appSubject('StockTaking', { branchId: OTHER_BRANCH_ID }))).toBe(
        false,
      );
    });

    it('can read Stock and StockMovement in own branch', () => {
      const ability = factory.createForUser(user(Role.MANAGER));

      expect(ability.can('read', appSubject('Stock', { branchId: BRANCH_ID }))).toBe(true);
      expect(ability.can('read', appSubject('StockMovement', { branchId: BRANCH_ID }))).toBe(true);
      expect(ability.can('read', appSubject('Stock', { branchId: OTHER_BRANCH_ID }))).toBe(false);
    });
  });

  describe('MASTER', () => {
    it('can read own Appointment and cannot read another master Appointment', () => {
      const ability = factory.createForUser(user(Role.MASTER));

      expect(ability.can('read', appSubject('Appointment', { masterId: MASTER_ID }))).toBe(true);
      expect(ability.can('read', appSubject('Appointment', { masterId: OTHER_USER_ID }))).toBe(
        false,
      );
    });

    it('can update own WorkOrder and cannot update another master WorkOrder', () => {
      const ability = factory.createForUser(user(Role.MASTER));

      expect(ability.can('update', appSubject('WorkOrder', { masterId: MASTER_ID }))).toBe(true);
      expect(ability.can('update', appSubject('WorkOrder', { masterId: OTHER_USER_ID }))).toBe(
        false,
      );
    });

    it('cannot manage Receipt or User', () => {
      const ability = factory.createForUser(user(Role.MASTER));

      expect(ability.can('manage', 'Receipt')).toBe(false);
      expect(ability.can('manage', 'User')).toBe(false);
    });

    it('can read Client/Vehicle/VisitHistory for own assignments', () => {
      const ability = factory.createForUser(user(Role.MASTER));

      expect(ability.can('read', appSubject('Client', { masterId: MASTER_ID }))).toBe(true);
      expect(ability.can('read', appSubject('Client', { masterId: OTHER_USER_ID }))).toBe(false);
      expect(ability.can('read', appSubject('Vehicle', { masterId: MASTER_ID }))).toBe(true);
      expect(ability.can('read', appSubject('VisitHistory', { masterId: MASTER_ID }))).toBe(true);
      expect(ability.can('create', 'Client')).toBe(false);
    });

    it('can read Sku and Stock in own branch only', () => {
      const ability = factory.createForUser(user(Role.MASTER));

      expect(ability.can('read', appSubject('Sku', { branchId: BRANCH_ID }))).toBe(true);
      expect(ability.can('read', appSubject('Stock', { branchId: BRANCH_ID }))).toBe(true);
      expect(ability.can('read', appSubject('Sku', { branchId: OTHER_BRANCH_ID }))).toBe(false);
      expect(ability.can('read', appSubject('Stock', { branchId: OTHER_BRANCH_ID }))).toBe(false);
    });

    it('cannot read cost fields', () => {
      const ability = factory.createForUser(user(Role.MASTER));

      expect(ability.can('read', 'Sku', 'averageCost')).toBe(false);
      expect(ability.can('read', 'Stock', 'unitCost')).toBe(false);
    });

    it('cannot create/update Sku, Supplier, Receipt, or any Inventory write', () => {
      const ability = factory.createForUser(user(Role.MASTER));

      expect(ability.can('create', 'Sku')).toBe(false);
      expect(ability.can('update', 'Sku')).toBe(false);
      expect(ability.can('read', 'Supplier')).toBe(false);
      expect(ability.can('create', 'Receipt')).toBe(false);
      expect(ability.can('create', 'Adjustment')).toBe(false);
      expect(ability.can('create', 'Transfer')).toBe(false);
      expect(ability.can('create', 'StockTaking')).toBe(false);
    });
  });

  describe('CLIENT', () => {
    it('can manage own Appointment and cannot manage another client Appointment', () => {
      const ability = factory.createForUser(user(Role.CLIENT));

      expect(ability.can('manage', appSubject('Appointment', { clientId: CLIENT_ID }))).toBe(true);
      expect(ability.can('manage', appSubject('Appointment', { clientId: OTHER_USER_ID }))).toBe(
        false,
      );
    });

    it('can read own profile and cannot read another profile', () => {
      const ability = factory.createForUser(user(Role.CLIENT));

      expect(ability.can('read', appSubject('User', { id: CLIENT_ID }))).toBe(true);
      expect(ability.can('read', appSubject('User', { id: OTHER_USER_ID }))).toBe(false);
    });

    it('cannot manage WorkOrder or Receipt', () => {
      const ability = factory.createForUser(user(Role.CLIENT));

      expect(ability.can('manage', 'WorkOrder')).toBe(false);
      expect(ability.can('manage', 'Receipt')).toBe(false);
    });

    it('can read own Client/Vehicle/VisitHistory and export-data', () => {
      const ability = factory.createForUser(user(Role.CLIENT));

      expect(ability.can('read', appSubject('Client', { clientId: CLIENT_ID }))).toBe(true);
      expect(ability.can('read', appSubject('Client', { clientId: OTHER_USER_ID }))).toBe(false);
      expect(ability.can('read', appSubject('Vehicle', { clientId: CLIENT_ID }))).toBe(true);
      expect(ability.can('read', appSubject('VisitHistory', { clientId: CLIENT_ID }))).toBe(true);
      expect(ability.can('export-data', appSubject('Client', { clientId: CLIENT_ID }))).toBe(true);
      expect(ability.can('export-data', appSubject('Client', { clientId: OTHER_USER_ID }))).toBe(
        false,
      );
      expect(ability.can('create', 'Client')).toBe(false);
      expect(ability.can('anonymize', 'Client')).toBe(false);
    });

    it('has zero Inventory permissions', () => {
      const ability = factory.createForUser(user(Role.CLIENT));

      expect(ability.can('read', 'Sku')).toBe(false);
      expect(ability.can('read', 'Stock')).toBe(false);
      expect(ability.can('read', 'Supplier')).toBe(false);
      expect(ability.can('create', 'Receipt')).toBe(false);
      expect(ability.can('create', 'Adjustment')).toBe(false);
      expect(ability.can('create', 'Transfer')).toBe(false);
      expect(ability.can('create', 'StockTaking')).toBe(false);
      expect(ability.can('read', 'StockMovement')).toBe(false);
    });
  });
});

function roleUserId(role: Role): string {
  if (role === Role.OWNER) {
    return OWNER_ID;
  }

  if (role === Role.MANAGER) {
    return MANAGER_ID;
  }

  if (role === Role.MASTER) {
    return MASTER_ID;
  }

  return CLIENT_ID;
}
