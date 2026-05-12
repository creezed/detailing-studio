import type {
  AppointmentCancelledEvent,
  AppointmentConfirmedEvent,
  LowStockReachedEvent,
  WorkOrderClosedEvent,
} from '@det/shared-contracts';
import type { UserId } from '@det/shared-types';

import { AppointmentCancelledHandler } from './appointment-cancelled.event-handler';
import { AppointmentConfirmedHandler } from './appointment-confirmed.event-handler';
import { LowStockReachedHandler } from './low-stock-reached.event-handler';
import { WorkOrderClosedHandler } from './work-order-closed.event-handler';
import { IssueNotificationCommand } from '../commands/issue-notification/issue-notification.command';

import type { IReminderScheduler } from '../ports/reminder-scheduler.port';
import type { IRoleRosterPort } from '../ports/role-roster.port';

function fakeCommandBus() {
  return {
    execute: jest.fn().mockResolvedValue({
      notificationIds: ['n-1'],
      deduped: [false],
    }),
  };
}

function fakeReminderScheduler(): IReminderScheduler {
  return {
    scheduleReminder: jest.fn(() => Promise.resolve()),
    cancelReminders: jest.fn(() => Promise.resolve()),
  };
}

function fakeRoleRoster(managerIds: UserId[] = [], ownerIds: UserId[] = []): IRoleRosterPort {
  return {
    getUserIdsByRoleAndBranch: jest.fn((role: string) =>
      Promise.resolve(role === 'MANAGER' ? managerIds : ownerIds),
    ),
    getOwnerUserIds: jest.fn().mockResolvedValue(ownerIds),
  };
}

describe('Event Handlers', () => {
  describe('AppointmentConfirmedHandler', () => {
    it('issues APPOINTMENT_CONFIRMED + schedules 2 reminders', async () => {
      const bus = fakeCommandBus();
      const scheduler = fakeReminderScheduler();
      const handler = new AppointmentConfirmedHandler(bus as never, scheduler);

      const event: AppointmentConfirmedEvent = {
        eventId: 'e-1',
        appointmentId: 'appt-1',
        clientId: 'u-1',
        datetime: '2024-06-20T10:00:00Z',
        serviceList: 'Полировка',
        branchAddress: 'ул. Тестовая 1',
        cancellationUrl: 'https://cancel/appt-1',
      };

      await handler.handle(event);

      expect(bus.execute).toHaveBeenCalledTimes(1);
      expect(bus.execute).toHaveBeenCalledWith(expect.any(IssueNotificationCommand));

      const cmdCalls = bus.execute.mock.calls as unknown[][];
      const cmd = cmdCalls[0]?.[0] as IssueNotificationCommand;

      expect(cmd.templateCode).toBe('APPOINTMENT_CONFIRMED');
      expect(scheduler.scheduleReminder).toHaveBeenCalledTimes(2); // eslint-disable-line @typescript-eslint/unbound-method

      const schedulerCalls = (scheduler.scheduleReminder as jest.Mock).mock.calls as unknown[][];

      expect(schedulerCalls[0]?.[0]).toBe('reminder:appt-1:24h');
      expect(schedulerCalls[1]?.[0]).toBe('reminder:appt-1:2h');
    });
  });

  describe('AppointmentCancelledHandler', () => {
    it('issues APPOINTMENT_CANCELLED + cancels reminders', async () => {
      const bus = fakeCommandBus();
      const scheduler = fakeReminderScheduler();
      const handler = new AppointmentCancelledHandler(bus as never, scheduler);

      const event: AppointmentCancelledEvent = {
        eventId: 'e-2',
        appointmentId: 'appt-1',
        clientId: 'u-1',
        reason: 'по запросу клиента',
      };

      await handler.handle(event);

      expect(bus.execute).toHaveBeenCalledTimes(1);

      const cmdCalls = bus.execute.mock.calls as unknown[][];
      const cmd = cmdCalls[0]?.[0] as IssueNotificationCommand;

      expect(cmd.templateCode).toBe('APPOINTMENT_CANCELLED');
      expect(scheduler.cancelReminders).toHaveBeenCalledWith('reminder:appt-1:24h'); // eslint-disable-line @typescript-eslint/unbound-method
      expect(scheduler.cancelReminders).toHaveBeenCalledWith('reminder:appt-1:2h'); // eslint-disable-line @typescript-eslint/unbound-method
    });
  });

  describe('LowStockReachedHandler', () => {
    it('sends notification to each manager and owner of the branch', async () => {
      const bus = fakeCommandBus();
      const roster = fakeRoleRoster(['mgr-1' as UserId, 'mgr-2' as UserId], []);
      const handler = new LowStockReachedHandler(bus as never, roster);

      const event: LowStockReachedEvent = {
        eventId: 'e-3',
        skuId: 'sku-1',
        skuName: 'Полироль',
        branchId: 'b-1',
        branchName: 'Филиал 1',
        currentQty: 2,
        reorderLevel: 5,
      };

      await handler.handle(event);

      expect(bus.execute).toHaveBeenCalledTimes(2);

      const cmdCalls = bus.execute.mock.calls as unknown[][];
      const cmd0 = cmdCalls[0]?.[0] as IssueNotificationCommand;
      const cmd1 = cmdCalls[1]?.[0] as IssueNotificationCommand;

      expect(cmd0.templateCode).toBe('LOW_STOCK');
      expect(cmd1.templateCode).toBe('LOW_STOCK');
    });
  });

  describe('WorkOrderClosedHandler', () => {
    it('issues WORK_ORDER_COMPLETED to client', async () => {
      const bus = fakeCommandBus();
      const handler = new WorkOrderClosedHandler(bus as never);

      const event: WorkOrderClosedEvent = {
        eventId: 'e-4',
        workOrderId: 'wo-1',
        clientId: 'u-1',
        serviceList: 'Мойка, Полировка',
        clientCabinetUrl: 'https://cabinet/wo-1',
      };

      await handler.handle(event);

      expect(bus.execute).toHaveBeenCalledTimes(1);

      const cmdCalls = bus.execute.mock.calls as unknown[][];
      const cmd = cmdCalls[0]?.[0] as IssueNotificationCommand;

      expect(cmd.templateCode).toBe('WORK_ORDER_COMPLETED');
      expect(cmd.recipient).toEqual({ kind: 'user', userId: 'u-1' });
    });
  });
});
