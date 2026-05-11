import { Inject } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';

import { Money } from '@det/backend-shared-ddd';
import type { IIdGenerator } from '@det/backend-shared-ddd';
import { WorkOrder } from '@det/backend-work-order-domain';
import type { IWorkOrderRepository } from '@det/backend-work-order-domain';

import { OpenWorkOrderCommand } from './open-work-order.command';
import { ID_GENERATOR, WORK_ORDER_REPOSITORY } from '../../di/tokens';

import type { ICommandHandler } from '@nestjs/cqrs';

@CommandHandler(OpenWorkOrderCommand)
export class OpenWorkOrderHandler implements ICommandHandler<OpenWorkOrderCommand, string> {
  constructor(
    @Inject(WORK_ORDER_REPOSITORY) private readonly repo: IWorkOrderRepository,
    @Inject(ID_GENERATOR) private readonly idGen: IIdGenerator,
  ) {}

  async execute(cmd: OpenWorkOrderCommand): Promise<string> {
    const existing = await this.repo.findByAppointmentId(cmd.appointmentId);
    if (existing) {
      return existing.id;
    }

    const wo = WorkOrder.openFromAppointment({
      appointmentId: cmd.appointmentId,
      branchId: cmd.branchId,
      clientId: cmd.clientId,
      idGen: this.idGen,
      masterId: cmd.masterId,
      norms: cmd.norms,
      openedAt: cmd.openedAt,
      services: cmd.services.map((s) => ({
        durationMinutes: s.durationMinutes,
        priceSnapshot: Money.rub(s.priceRubles),
        serviceId: s.serviceId,
        serviceNameSnapshot: s.serviceNameSnapshot,
      })),
      vehicleId: cmd.vehicleId,
    });

    await this.repo.save(wo);
    return wo.id;
  }
}
