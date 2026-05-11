import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import {
  AvailabilityCalculator,
  Duration,
  TimeSlot,
  Timezone,
} from '@det/backend-scheduling-domain';
import type {
  IAppointmentRepository,
  IBranchRepository,
  IBranchScheduleRepository,
  IMasterScheduleRepository,
  MasterSchedule,
} from '@det/backend-scheduling-domain';
import { CLOCK, DateTime } from '@det/backend-shared-ddd';
import type { IClock } from '@det/backend-shared-ddd';
import type { ServiceId } from '@det/shared-types';

import { GetAvailableSlotsQuery } from './get-available-slots.query';
import {
  APPOINTMENT_REPOSITORY,
  BRANCH_REPOSITORY,
  BRANCH_SCHEDULE_REPOSITORY,
  CATALOG_SERVICE_PORT,
  MASTER_SCHEDULE_REPOSITORY,
} from '../../di/tokens';
import {
  BranchNotFoundError,
  BranchScheduleNotFoundError,
  MasterScheduleNotFoundError,
  ServiceInactiveError,
  ServiceNotFoundError,
  ServicePriceUnavailableError,
} from '../../errors/application.errors';

import type {
  CatalogServicePricingReadModel,
  ICatalogServicePort,
} from '../../ports/catalog-service.port';
import type { VehicleBodyType } from '../../ports/crm-vehicle.port';
import type { AvailableSlotReadModel } from '../../read-models/scheduling.read-models';

const DEFAULT_LOOKAHEAD_DAYS = 14;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

@QueryHandler(GetAvailableSlotsQuery)
export class GetAvailableSlotsHandler implements IQueryHandler<
  GetAvailableSlotsQuery,
  readonly AvailableSlotReadModel[]
> {
  private readonly availabilityCalculator = new AvailabilityCalculator();

  constructor(
    @Inject(BRANCH_REPOSITORY) private readonly branchRepo: IBranchRepository,
    @Inject(BRANCH_SCHEDULE_REPOSITORY)
    private readonly branchScheduleRepo: IBranchScheduleRepository,
    @Inject(MASTER_SCHEDULE_REPOSITORY)
    private readonly masterScheduleRepo: IMasterScheduleRepository,
    @Inject(APPOINTMENT_REPOSITORY) private readonly appointmentRepo: IAppointmentRepository,
    @Inject(CATALOG_SERVICE_PORT) private readonly catalogServicePort: ICatalogServicePort,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(query: GetAvailableSlotsQuery): Promise<readonly AvailableSlotReadModel[]> {
    const branch = await this.branchRepo.findById(query.branchId);
    if (branch === null) {
      throw new BranchNotFoundError(query.branchId);
    }

    const branchSchedule = await this.branchScheduleRepo.findByBranchId(query.branchId);
    if (branchSchedule === null) {
      throw new BranchScheduleNotFoundError(query.branchId);
    }

    const servicesDuration = await this.servicesDuration(query.services, query.bodyType);
    const masterSchedules = await this.masterSchedules(query);
    const from = query.from ?? this.clock.now();
    const to = query.to ?? fromShiftedByDays(from, DEFAULT_LOOKAHEAD_DAYS);
    const timezone = Timezone.from(branch.toSnapshot().timezone);
    const searchSlot = TimeSlot.from(from, to, timezone);
    const existingAppointments = await Promise.all(
      masterSchedules.map((schedule) =>
        this.appointmentRepo.findOverlappingForMaster(schedule.masterId, searchSlot),
      ),
    );

    return this.availabilityCalculator
      .calculate({
        branchSchedule,
        existingAppointments: existingAppointments.flat(),
        masterId: query.masterId,
        masterSchedules,
        searchRange: { from: from.toDate(), to: to.toDate() },
        servicesDuration,
        timezone,
      })
      .map((slot) => ({
        branchId: slot.branchId,
        masterId: slot.masterId,
        slotEnd: slot.slot.end.iso(),
        slotStart: slot.slot.start.iso(),
        timezone: slot.slot.timezone.getValue(),
      }));
  }

  private async servicesDuration(
    serviceIds: readonly ServiceId[],
    bodyType: VehicleBodyType,
  ): Promise<Duration> {
    const services = await this.catalogServicePort.getMany(serviceIds);
    const servicesById = new Map(services.map((service) => [service.id, service]));
    let durationMinutes = 0;

    for (const serviceId of serviceIds) {
      const service = servicesById.get(serviceId);
      if (service === undefined) {
        throw new ServiceNotFoundError(serviceId);
      }
      if (!service.isActive) {
        throw new ServiceInactiveError(serviceId);
      }
      this.assertPriceAvailable(serviceId, service.pricing, bodyType);
      durationMinutes += service.durationMinutes;
    }

    return Duration.minutes(durationMinutes);
  }

  private async masterSchedules(query: GetAvailableSlotsQuery): Promise<readonly MasterSchedule[]> {
    if (query.masterId !== undefined) {
      const schedule = await this.masterScheduleRepo.findByMasterAndBranch(
        query.masterId,
        query.branchId,
      );
      if (schedule === null) {
        throw new MasterScheduleNotFoundError(query.masterId, query.branchId);
      }
      return [schedule];
    }

    return this.masterScheduleRepo.findAllByBranch(query.branchId);
  }

  private assertPriceAvailable(
    serviceId: ServiceId,
    pricing: CatalogServicePricingReadModel,
    bodyType: VehicleBodyType,
  ): void {
    if (pricing.type === 'FIXED') {
      return;
    }

    if (!pricing.prices.some((entry) => entry.bodyType === bodyType)) {
      throw new ServicePriceUnavailableError(serviceId, bodyType);
    }
  }
}

function fromShiftedByDays(from: DateTime, days: number): DateTime {
  return DateTime.from(from.toDate().getTime() + days * MS_PER_DAY);
}
