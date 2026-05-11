import { Inject, Injectable } from '@nestjs/common';

import {
  AppointmentServiceId,
  AvailabilityCalculator,
  Duration,
} from '@det/backend-scheduling-domain';
import type {
  AppointmentId,
  AppointmentService,
  BayId,
  BranchId,
  IAppointmentRepository,
  IBranchScheduleRepository,
  IMasterScheduleRepository,
  MasterId,
  TimeSlot,
} from '@det/backend-scheduling-domain';
import { ApplicationError, err, ok } from '@det/backend-shared-ddd';
import type { IIdGenerator, Money, Result } from '@det/backend-shared-ddd';
import type { ClientId, ServiceId, VehicleId } from '@det/shared-types';

import { isApplicationError } from './appointment-command-result';
import {
  APPOINTMENT_REPOSITORY,
  BRANCH_SCHEDULE_REPOSITORY,
  CATALOG_SERVICE_PORT,
  CRM_VEHICLE_PORT,
  ID_GENERATOR,
  MASTER_SCHEDULE_REPOSITORY,
} from '../di/tokens';
import {
  BranchScheduleNotFoundError,
  MasterScheduleNotFoundError,
  ServiceInactiveError,
  ServiceNotFoundError,
  ServicePriceUnavailableError,
  SlotConflictError,
  VehicleInactiveError,
} from '../errors/application.errors';

import type {
  CatalogServicePricingReadModel,
  CatalogServiceReadModel,
  ICatalogServicePort,
} from '../ports/catalog-service.port';
import type { ICrmVehiclePort, VehicleBodyType } from '../ports/crm-vehicle.port';

const GRID_STEP_MINUTES = 15;
const MS_PER_MINUTE = 60_000;

export interface BuildAppointmentServicesRequest {
  readonly clientId: ClientId;
  readonly vehicleId: VehicleId;
  readonly serviceIds: readonly ServiceId[];
}

export interface AssertAppointmentSlotAvailableRequest {
  readonly branchId: BranchId;
  readonly masterId: MasterId;
  readonly bayId: BayId | null;
  readonly slot: TimeSlot;
  readonly servicesDurationMinutes: number;
  readonly excludeAppointmentId?: AppointmentId;
}

@Injectable()
export class AppointmentHotPathService {
  private readonly availabilityCalculator = new AvailabilityCalculator();

  constructor(
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointmentRepo: IAppointmentRepository,
    @Inject(BRANCH_SCHEDULE_REPOSITORY)
    private readonly branchScheduleRepo: IBranchScheduleRepository,
    @Inject(MASTER_SCHEDULE_REPOSITORY)
    private readonly masterScheduleRepo: IMasterScheduleRepository,
    @Inject(CATALOG_SERVICE_PORT) private readonly catalogServicePort: ICatalogServicePort,
    @Inject(CRM_VEHICLE_PORT) private readonly crmVehiclePort: ICrmVehiclePort,
    @Inject(ID_GENERATOR) private readonly idGen: IIdGenerator,
  ) {}

  async buildAppointmentServices(
    request: BuildAppointmentServicesRequest,
  ): Promise<Result<readonly AppointmentService[], ApplicationError>> {
    let vehicleBodyType: VehicleBodyType;
    try {
      const vehicle = await this.crmVehiclePort.getOrThrow(request.clientId, request.vehicleId);
      if (!vehicle.isActive) {
        return err(new VehicleInactiveError(request.vehicleId));
      }
      vehicleBodyType = vehicle.bodyType;
    } catch (error) {
      if (isApplicationError(error)) {
        return err(error);
      }
      throw error;
    }

    const services = await this.catalogServicePort.getMany(request.serviceIds);
    const servicesById = new Map<string, CatalogServiceReadModel>(
      services.map((service) => [service.id, service]),
    );
    const appointmentServices: AppointmentService[] = [];

    for (const serviceId of request.serviceIds) {
      const service = servicesById.get(serviceId);
      if (service === undefined) {
        return err(new ServiceNotFoundError(serviceId));
      }
      if (!service.isActive) {
        return err(new ServiceInactiveError(serviceId));
      }

      const price = this.priceFor(service.id, service.pricing, vehicleBodyType);
      if (price instanceof ApplicationError) {
        return err(price);
      }

      appointmentServices.push({
        durationMinutesSnapshot: service.durationMinutes,
        id: AppointmentServiceId.generate(this.idGen),
        priceSnapshot: price,
        serviceId,
        serviceNameSnapshot: service.name,
      });
    }

    return ok(appointmentServices);
  }

  async assertSlotAvailable(
    request: AssertAppointmentSlotAvailableRequest,
  ): Promise<ApplicationError | null> {
    const branchSchedule = await this.branchScheduleRepo.findByBranchId(request.branchId);
    if (branchSchedule === null) {
      return new BranchScheduleNotFoundError(request.branchId);
    }

    const masterSchedule = await this.masterScheduleRepo.findByMasterAndBranch(
      request.masterId,
      request.branchId,
    );
    if (masterSchedule === null) {
      return new MasterScheduleNotFoundError(request.masterId, request.branchId);
    }

    const overlappingMasterAppointments = await this.appointmentRepo.findOverlappingForMaster(
      request.masterId,
      request.slot,
      request.excludeAppointmentId,
    );
    const availableSlots = this.availabilityCalculator.calculate({
      branchSchedule,
      existingAppointments: overlappingMasterAppointments,
      gridStep: Duration.minutes(GRID_STEP_MINUTES),
      masterId: request.masterId,
      masterSchedules: [masterSchedule],
      searchRange: {
        from: this.shift(request.slot.start.toDate(), -GRID_STEP_MINUTES),
        to: this.shift(request.slot.end.toDate(), GRID_STEP_MINUTES),
      },
      servicesDuration: Duration.minutes(request.servicesDurationMinutes),
      timezone: request.slot.timezone,
    });

    const requestedStartMs = request.slot.start.toDate().getTime();
    const hasAvailableStart = availableSlots.some(
      (availableSlot) => availableSlot.slot.start.toDate().getTime() === requestedStartMs,
    );
    if (!hasAvailableStart) {
      return new SlotConflictError();
    }

    if (request.bayId !== null) {
      const overlappingBayAppointments = await this.appointmentRepo.findOverlappingForBay(
        request.bayId,
        request.slot,
        request.excludeAppointmentId,
      );
      if (overlappingBayAppointments.length > 0) {
        return new SlotConflictError();
      }
    }

    return null;
  }

  private priceFor(
    serviceId: ServiceId,
    pricing: CatalogServicePricingReadModel,
    bodyType: VehicleBodyType,
  ): Money | ApplicationError {
    if (pricing.type === 'FIXED') {
      return pricing.price;
    }

    const price = pricing.prices.find((entry) => entry.bodyType === bodyType)?.price;
    return price ?? new ServicePriceUnavailableError(serviceId, bodyType);
  }

  private shift(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * MS_PER_MINUTE);
  }
}
