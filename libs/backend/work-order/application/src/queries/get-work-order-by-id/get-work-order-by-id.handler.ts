import { Inject } from '@nestjs/common';
import { QueryHandler } from '@nestjs/cqrs';

import { WorkOrderId } from '@det/backend-work-order-domain';
import type { IWorkOrderRepository } from '@det/backend-work-order-domain';

import { GetWorkOrderByIdQuery } from './get-work-order-by-id.query';
import {
  CATALOG_SKU_PORT,
  CRM_CLIENT_PORT,
  CRM_VEHICLE_PORT,
  IAM_USER_PORT,
  WORK_ORDER_REPOSITORY,
} from '../../di/tokens';
import { WorkOrderNotFoundError } from '../../errors/application.errors';

import type { ICatalogSkuPort } from '../../ports/catalog-sku.port';
import type { ICrmClientPort } from '../../ports/crm-client.port';
import type { ICrmVehiclePort } from '../../ports/crm-vehicle.port';
import type { IIamUserPort } from '../../ports/iam-user.port';
import type { WorkOrderDetailReadModel } from '../../read-models/work-order.read-models';
import type { IQueryHandler } from '@nestjs/cqrs';

@QueryHandler(GetWorkOrderByIdQuery)
export class GetWorkOrderByIdHandler implements IQueryHandler<
  GetWorkOrderByIdQuery,
  WorkOrderDetailReadModel
> {
  constructor(
    @Inject(WORK_ORDER_REPOSITORY) private readonly repo: IWorkOrderRepository,
    @Inject(IAM_USER_PORT) private readonly iamUserPort: IIamUserPort,
    @Inject(CRM_CLIENT_PORT) private readonly crmClientPort: ICrmClientPort,
    @Inject(CRM_VEHICLE_PORT) private readonly crmVehiclePort: ICrmVehiclePort,
    @Inject(CATALOG_SKU_PORT) private readonly catalogSkuPort: ICatalogSkuPort,
  ) {}

  async execute(query: GetWorkOrderByIdQuery): Promise<WorkOrderDetailReadModel> {
    const wo = await this.repo.findById(WorkOrderId.from(query.workOrderId));
    if (!wo) {
      throw new WorkOrderNotFoundError(query.workOrderId);
    }

    const snapshot = wo.toSnapshot();

    const skuIds = [...new Set(snapshot.lines.map((l) => l.skuId))];
    const [master, client, vehicle, skus] = await Promise.all([
      this.iamUserPort.getById(snapshot.masterId),
      this.crmClientPort.getById(snapshot.clientId),
      this.crmVehiclePort.getById(snapshot.vehicleId),
      skuIds.length > 0 ? this.catalogSkuPort.getMany(skuIds) : Promise.resolve([]),
    ]);

    const skuMap = new Map(skus.map((s) => [s.id, s]));

    return {
      id: snapshot.id,
      appointmentId: snapshot.appointmentId,
      status: snapshot.status,
      openedAt: snapshot.openedAt,
      closedAt: snapshot.closedAt,
      cancellationReason: snapshot.cancellationReason,
      master: {
        id: snapshot.masterId,
        fullName: master?.fullName ?? 'Неизвестный мастер',
      },
      client: {
        id: snapshot.clientId,
        fullName: client?.fullName ?? 'Неизвестный клиент',
        phone: client?.phone ?? null,
      },
      vehicle: {
        id: snapshot.vehicleId,
        make: vehicle?.make ?? '',
        model: vehicle?.model ?? '',
        licensePlate: vehicle?.licensePlate ?? '',
      },
      services: snapshot.services.map((s) => ({
        serviceId: s.serviceId,
        serviceName: s.serviceNameSnapshot,
        durationMinutes: s.durationMinutes,
        priceCents: String(s.priceCents),
      })),
      lines: snapshot.lines.map((l) => {
        const sku = skuMap.get(l.skuId);
        const normAmount = l.normAmount;
        const deviationRatio =
          normAmount === 0
            ? l.actualAmount > 0
              ? Infinity
              : 0
            : (l.actualAmount - normAmount) / normAmount;

        return {
          id: l.id,
          skuId: l.skuId,
          skuName: sku?.name ?? l.skuId,
          unit: sku?.unit ?? l.actualUnit,
          normAmount,
          actualAmount: l.actualAmount,
          deviationRatio,
          deviationReason: l.deviationReason,
          comment: l.comment,
        };
      }),
      photosBefore: snapshot.photosBefore.map((p) => ({
        id: p.id,
        url: p.url,
        thumbnailUrl: p.thumbnailUrl,
      })),
      photosAfter: snapshot.photosAfter.map((p) => ({
        id: p.id,
        url: p.url,
        thumbnailUrl: p.thumbnailUrl,
      })),
    };
  }
}
