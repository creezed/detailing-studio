import { Role } from '@det/backend/iam/domain';

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
  });

  describe('MANAGER', () => {
    it('can manage Appointment, Client and Receipt in assigned branches', () => {
      const ability = factory.createForUser(user(Role.MANAGER));

      expect(ability.can('manage', appSubject('Appointment', { branchId: BRANCH_ID }))).toBe(true);
      expect(ability.can('manage', appSubject('Client', { branchId: BRANCH_ID }))).toBe(true);
      expect(ability.can('manage', appSubject('Receipt', { branchId: BRANCH_ID }))).toBe(true);
    });

    it('cannot manage Appointment, Client and Receipt outside assigned branches', () => {
      const ability = factory.createForUser(user(Role.MANAGER));

      expect(ability.can('manage', appSubject('Appointment', { branchId: OTHER_BRANCH_ID }))).toBe(
        false,
      );
      expect(ability.can('manage', appSubject('Client', { branchId: OTHER_BRANCH_ID }))).toBe(
        false,
      );
      expect(ability.can('manage', appSubject('Receipt', { branchId: OTHER_BRANCH_ID }))).toBe(
        false,
      );
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

    it('cannot manage WorkOrder, Client or Receipt', () => {
      const ability = factory.createForUser(user(Role.CLIENT));

      expect(ability.can('manage', 'WorkOrder')).toBe(false);
      expect(ability.can('manage', 'Client')).toBe(false);
      expect(ability.can('manage', 'Receipt')).toBe(false);
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
