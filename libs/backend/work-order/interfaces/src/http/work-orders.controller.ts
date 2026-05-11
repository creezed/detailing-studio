import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CheckAbility, CurrentUser } from '@det/backend-shared-auth';
import type { AuthenticatedUser } from '@det/backend-shared-auth';
import {
  CancelWorkOrderCommand,
  CloseWorkOrderCommand,
  GetMyWorkOrdersQuery,
  GetWorkOrderByAppointmentQuery,
  GetWorkOrderByIdQuery,
  ListWorkOrdersQuery,
  ReopenWorkOrderCommand,
  ReturnToInProgressCommand,
  SubmitForReviewCommand,
  WorkOrderStatus,
} from '@det/backend-work-order-application';
import type {
  CursorPaginatedResult,
  MyWorkOrderReadModel,
  WorkOrderDetailReadModel,
  WorkOrderListItemReadModel,
} from '@det/backend-work-order-application';

import {
  CancelWorkOrderRequestDto,
  GetMyWorkOrdersQueryDto,
  ListWorkOrdersQueryDto,
  PaginatedWorkOrderListResponseDto,
  ReopenWorkOrderRequestDto,
  ReturnToInProgressRequestDto,
} from '../dto/work-order.dto';

@ApiTags('work-orders')
@ApiBearerAuth()
@Controller('work-orders')
export class WorkOrdersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @CheckAbility((ab) => ab.can('read', 'WorkOrder'))
  @ApiOperation({ summary: 'Список нарядов' })
  @ApiOkResponse({ type: PaginatedWorkOrderListResponseDto })
  async list(
    @Query() q: ListWorkOrdersQueryDto,
  ): Promise<CursorPaginatedResult<WorkOrderListItemReadModel>> {
    const dateRange = q.dateFrom && q.dateTo ? { from: q.dateFrom, to: q.dateTo } : undefined;

    return this.queryBus.execute(
      new ListWorkOrdersQuery(
        {
          branchId: q.branchId,
          masterId: q.masterId,
          clientId: q.clientId,
          status: q.status as WorkOrderStatus | undefined,
          dateRange,
        },
        q.limit,
        q.cursor,
      ),
    );
  }

  @Get('my')
  @CheckAbility((ab, ctx) => ab.can('read', 'WorkOrder') && ctx.user.role === 'MASTER')
  @ApiOperation({ summary: 'Мои наряды (для мастера)' })
  @ApiOkResponse({ description: 'Список нарядов текущего мастера' })
  async my(
    @CurrentUser() user: AuthenticatedUser,
    @Query() q: GetMyWorkOrdersQueryDto,
  ): Promise<readonly MyWorkOrderReadModel[]> {
    return this.queryBus.execute(
      new GetMyWorkOrdersQuery(user.id, (q.statuses ?? []) as WorkOrderStatus[], q.date),
    );
  }

  @Get('by-appointment/:appointmentId')
  @CheckAbility((ab) => ab.can('read', 'WorkOrder'))
  @ApiOperation({ summary: 'Наряд по записи' })
  @ApiOkResponse({ description: 'Наряд, связанный с записью' })
  async byAppointment(
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
  ): Promise<WorkOrderDetailReadModel | null> {
    return this.queryBus.execute(new GetWorkOrderByAppointmentQuery(appointmentId));
  }

  @Get(':id')
  @CheckAbility((ab) => ab.can('read', 'WorkOrder'))
  @ApiOperation({ summary: 'Детали наряда' })
  @ApiOkResponse({ description: 'Наряд по ID' })
  async getById(@Param('id', ParseUUIDPipe) id: string): Promise<WorkOrderDetailReadModel> {
    return this.queryBus.execute(new GetWorkOrderByIdQuery(id));
  }

  @Post(':id/submit-for-review')
  @CheckAbility((ab) => ab.can('submit-for-review', 'WorkOrder'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Отправить наряд на проверку' })
  @ApiNoContentResponse()
  async submitForReview(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.commandBus.execute(new SubmitForReviewCommand(id, user.id));
  }

  @Post(':id/return-to-in-progress')
  @CheckAbility((ab) => ab.can('return-to-in-progress', 'WorkOrder'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Вернуть наряд в работу' })
  @ApiNoContentResponse()
  async returnToInProgress(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReturnToInProgressRequestDto,
  ): Promise<void> {
    await this.commandBus.execute(new ReturnToInProgressCommand(id, user.id, dto.reason));
  }

  @Post(':id/close')
  @CheckAbility((ab) => ab.can('close', 'WorkOrder'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Закрыть наряд (Idempotency-Key обязателен)' })
  @ApiNoContentResponse()
  async close(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('idempotency-key') idempotencyKey: string,
  ): Promise<void> {
    await this.commandBus.execute(new CloseWorkOrderCommand(id, user.id, idempotencyKey));
  }

  @Post(':id/cancel')
  @CheckAbility((ab) => ab.can('cancel', 'WorkOrder'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Отменить наряд' })
  @ApiNoContentResponse()
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CancelWorkOrderRequestDto,
  ): Promise<void> {
    await this.commandBus.execute(new CancelWorkOrderCommand(id, dto.reason, user.id));
  }

  @Post(':id/reopen')
  @CheckAbility((ab, ctx) => {
    const role = ctx.user.role;
    return (role === 'OWNER' || role === 'MANAGER') && ab.can('reopen', 'WorkOrder');
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Переоткрыть наряд (только OWNER/MANAGER)' })
  @ApiNoContentResponse()
  async reopen(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReopenWorkOrderRequestDto,
  ): Promise<void> {
    await this.commandBus.execute(new ReopenWorkOrderCommand(id, user.id, dto.reason));
  }
}
