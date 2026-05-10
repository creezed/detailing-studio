/* eslint-disable @typescript-eslint/unbound-method */
import type { IIdGenerator } from '@det/backend-shared-ddd';

import { VisitHistoryProjector } from '../projections/visit-history.projector';

import type { IVisitHistoryWritePort, UpsertVisitHistoryData } from '../ports/visit-history.port';

const APPOINTMENT_ID = 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1';
const CLIENT_ID = '11111111-1111-4111-8111-111111111111';
const VEHICLE_ID = '22222222-2222-4222-8222-222222222222';
const BRANCH_ID = '33333333-3333-4333-8333-333333333333';
const MASTER_ID = '44444444-4444-4444-8444-444444444444';
const WORK_ORDER_ID = '55555555-5555-4555-8555-555555555555';
const VISIT_ID = '66666666-6666-4666-8666-666666666666';

function createMockWritePort(): IVisitHistoryWritePort & { upserted: UpsertVisitHistoryData[] } {
  const upserted: UpsertVisitHistoryData[] = [];

  return {
    upserted,
    upsert: jest.fn().mockImplementation((data: UpsertVisitHistoryData) => {
      upserted.push(data);

      return Promise.resolve();
    }),
    updateByAppointmentId: jest.fn().mockImplementation(() => Promise.resolve()),
    clearPhotosForClient: jest.fn().mockImplementation(() => Promise.resolve()),
  };
}

function createIdGen(): IIdGenerator {
  return { generate: () => VISIT_ID };
}

describe('VisitHistoryProjector', () => {
  let projector: VisitHistoryProjector;
  let writePort: ReturnType<typeof createMockWritePort>;

  beforeEach(() => {
    writePort = createMockWritePort();
    projector = new VisitHistoryProjector(writePort, createIdGen());
  });

  describe('AppointmentConfirmed', () => {
    const payload = {
      appointmentId: APPOINTMENT_ID,
      clientId: CLIENT_ID,
      vehicleId: VEHICLE_ID,
      branchId: BRANCH_ID,
      masterId: MASTER_ID,
      scheduledAt: '2026-02-01T10:00:00.000Z',
      services: [
        { serviceId: 's1', name: 'Полировка', priceCents: 500000 },
        { serviceId: 's2', name: 'Мойка', priceCents: 100000 },
      ],
    };

    it('inserts a new visit history row with status SCHEDULED', async () => {
      await projector.handle({ eventType: 'AppointmentConfirmed', payload });

      expect(writePort.upsert).toHaveBeenCalledTimes(1);
      const inserted = writePort.upserted[0];
      expect(inserted).toBeDefined();
      expect(inserted?.appointmentId).toBe(APPOINTMENT_ID);
      expect(inserted?.clientId).toBe(CLIENT_ID);
      expect(inserted?.status).toBe('SCHEDULED');
      expect(inserted?.servicesSummary).toHaveLength(2);
      expect(inserted?.workOrderId).toBeNull();
      expect(inserted?.startedAt).toBeNull();
    });

    it('is idempotent — upsert called each time (ON CONFLICT handled by infra)', async () => {
      await projector.handle({ eventType: 'AppointmentConfirmed', payload });
      await projector.handle({ eventType: 'AppointmentConfirmed', payload });

      expect(writePort.upsert).toHaveBeenCalledTimes(2);
    });
  });

  describe('AppointmentRescheduled', () => {
    it('updates scheduledAt for appointment', async () => {
      const payload = {
        appointmentId: APPOINTMENT_ID,
        newScheduledAt: '2026-02-05T14:00:00.000Z',
      };

      await projector.handle({ eventType: 'AppointmentRescheduled', payload });

      expect(writePort.updateByAppointmentId).toHaveBeenCalledWith(APPOINTMENT_ID, {
        scheduledAt: '2026-02-05T14:00:00.000Z',
      });
    });
  });

  describe('AppointmentCancelled', () => {
    it('updates status to CANCELLED', async () => {
      const payload = {
        appointmentId: APPOINTMENT_ID,
        cancelledAt: '2026-02-01T09:00:00.000Z',
      };

      await projector.handle({ eventType: 'AppointmentCancelled', payload });

      expect(writePort.updateByAppointmentId).toHaveBeenCalledWith(APPOINTMENT_ID, {
        status: 'CANCELLED',
        cancelledAt: '2026-02-01T09:00:00.000Z',
      });
    });
  });

  describe('AppointmentNoShowed', () => {
    it('updates status to NO_SHOW', async () => {
      const payload = { appointmentId: APPOINTMENT_ID };

      await projector.handle({ eventType: 'AppointmentNoShowed', payload });

      expect(writePort.updateByAppointmentId).toHaveBeenCalledWith(APPOINTMENT_ID, {
        status: 'NO_SHOW',
      });
    });
  });

  describe('WorkOrderOpened', () => {
    it('updates workOrderId and startedAt', async () => {
      const payload = {
        workOrderId: WORK_ORDER_ID,
        appointmentId: APPOINTMENT_ID,
        startedAt: '2026-02-01T10:05:00.000Z',
      };

      await projector.handle({ eventType: 'WorkOrderOpened', payload });

      expect(writePort.updateByAppointmentId).toHaveBeenCalledWith(APPOINTMENT_ID, {
        workOrderId: WORK_ORDER_ID,
        startedAt: '2026-02-01T10:05:00.000Z',
      });
    });
  });

  describe('WorkOrderClosed', () => {
    it('updates completion data and status to COMPLETED', async () => {
      const payload = {
        workOrderId: WORK_ORDER_ID,
        appointmentId: APPOINTMENT_ID,
        completedAt: '2026-02-01T12:00:00.000Z',
        totalAmountCents: 600000,
        materialsTotalCents: 50000,
        photoCount: 4,
        beforePhotoUrls: ['https://s3/before1.jpg', 'https://s3/before2.jpg'],
        afterPhotoUrls: ['https://s3/after1.jpg', 'https://s3/after2.jpg'],
      };

      await projector.handle({ eventType: 'WorkOrderClosed', payload });

      expect(writePort.updateByAppointmentId).toHaveBeenCalledWith(APPOINTMENT_ID, {
        status: 'COMPLETED',
        completedAt: '2026-02-01T12:00:00.000Z',
        totalAmountCents: 600000,
        materialsTotalCents: 50000,
        photoCount: 4,
        beforePhotoUrls: ['https://s3/before1.jpg', 'https://s3/before2.jpg'],
        afterPhotoUrls: ['https://s3/after1.jpg', 'https://s3/after2.jpg'],
      });
    });
  });

  describe('ClientAnonymized', () => {
    it('clears photos for client', async () => {
      await projector.onClientAnonymized(CLIENT_ID);

      expect(writePort.clearPhotosForClient).toHaveBeenCalledWith(CLIENT_ID);
    });
  });

  describe('unknown event', () => {
    it('does nothing for unsupported event types', async () => {
      await projector.handle({ eventType: 'SomeUnknownEvent', payload: {} });

      expect(writePort.upsert).not.toHaveBeenCalled();
      expect(writePort.updateByAppointmentId).not.toHaveBeenCalled();
    });
  });

  describe('supportedEventTypes', () => {
    it('returns all 6 supported event type strings', () => {
      const types = VisitHistoryProjector.supportedEventTypes();
      expect(types).toHaveLength(6);
      expect(types).toContain('AppointmentConfirmed');
      expect(types).toContain('WorkOrderClosed');
    });
  });
});
