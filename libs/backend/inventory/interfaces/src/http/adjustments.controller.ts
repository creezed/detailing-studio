import {
  Body,
  Controller,
  Get,
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
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import {
  AdjustmentId,
  ApproveAdjustmentCommand,
  CreateAdjustmentCommand,
  ListAdjustmentsQuery,
  ListPendingApprovalsQuery,
  RejectAdjustmentCommand,
  SignedQuantity,
} from '@det/backend-inventory-application';
import type { AdjustmentLineInput } from '@det/backend-inventory-application';
import { CheckAbility, CurrentUser } from '@det/backend-shared-auth';
import type { AuthenticatedUser } from '@det/backend-shared-auth';
import type { UnitOfMeasure } from '@det/backend-shared-ddd';
import type { BranchId, SkuId, UserId } from '@det/shared-types';

import {
  AdjustmentCreatedResponseDto,
  AdjustmentListQueryDto,
  CreateAdjustmentRequestDto,
  RejectAdjustmentRequestDto,
} from '../dto/adjustment.dto';
import { centsToMoney } from '../mappers/money.mapper';

@ApiTags('adjustments')
@ApiBearerAuth()
@Controller('adjustments')
export class AdjustmentsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @CheckAbility((ab) => ab.can('read', 'Adjustment'))
  @ApiOperation({ summary: 'Список корректировок' })
  @ApiOkResponse({ description: 'Постраничный список корректировок' })
  async list(@Query() q: AdjustmentListQueryDto): Promise<unknown> {
    return this.queryBus.execute(new ListAdjustmentsQuery(q.offset, q.limit, q.branchId, q.status));
  }

  @Get('pending-approvals')
  @CheckAbility((ab) => ab.can('approve', 'Adjustment'))
  @ApiOperation({ summary: 'Корректировки, ожидающие утверждения' })
  @ApiOkResponse({ description: 'Список корректировок со статусом PENDING' })
  async pendingApprovals(@Query() q: AdjustmentListQueryDto): Promise<unknown> {
    return this.queryBus.execute(new ListPendingApprovalsQuery(q.offset, q.limit));
  }

  @Post()
  @CheckAbility((ab) => ab.can('manage', 'Adjustment'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Создать корректировку' })
  @ApiCreatedResponse({ type: AdjustmentCreatedResponseDto })
  async create(
    @Body() dto: CreateAdjustmentRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AdjustmentCreatedResponseDto> {
    const lines: AdjustmentLineInput[] = dto.lines.map((l) => ({
      skuId: l.skuId as unknown as SkuId,
      delta: SignedQuantity.of(l.deltaAmount, l.deltaUnit as UnitOfMeasure),
      snapshotUnitCost: centsToMoney(l.snapshotUnitCostCents),
    }));

    const result = await this.commandBus.execute<CreateAdjustmentCommand, { id: AdjustmentId }>(
      new CreateAdjustmentCommand(
        dto.branchId as unknown as BranchId,
        dto.reason,
        lines,
        user.id as unknown as UserId,
      ),
    );

    return { id: result.id };
  }

  @Post(':id/approve')
  @CheckAbility((ab) => ab.can('approve', 'Adjustment'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Утвердить корректировку (только OWNER)' })
  @ApiNoContentResponse()
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.commandBus.execute(
      new ApproveAdjustmentCommand(AdjustmentId.from(id), user.id as unknown as UserId),
    );
  }

  @Post(':id/reject')
  @CheckAbility((ab) => ab.can('approve', 'Adjustment'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Отклонить корректировку' })
  @ApiNoContentResponse()
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectAdjustmentRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.commandBus.execute(
      new RejectAdjustmentCommand(AdjustmentId.from(id), user.id as unknown as UserId, dto.reason),
    );
  }
}
