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
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import {
  CancelSubscriptionCommand,
  ChangePlanCommand,
  GetCurrentSubscriptionQuery,
  GetInvoiceByIdQuery,
  GetTariffLimitsUsageQuery,
  ListInvoicesQuery,
  PayInvoiceCommand,
} from '@det/backend-billing-application';
import type {
  InvoiceDto,
  LimitsUsageReportDto,
  SubscriptionDto,
} from '@det/backend-billing-application';
import { CheckAbility, CurrentUser } from '@det/backend-shared-auth';
import type { AuthenticatedUser } from '@det/backend-shared-auth';
import type { InvoiceId, TenantId, UserId } from '@det/shared-types';

import {
  CancelSubscriptionBodyDto,
  ChangePlanBodyDto,
  PayInvoiceResponseDto,
} from '../dto/command.dto';
import { InvoiceResponseDto } from '../dto/invoice.dto';
import { SubscriptionResponseDto } from '../dto/subscription.dto';

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('subscription')
export class SubscriptionController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Текущая подписка студии' })
  @ApiOkResponse({ type: SubscriptionResponseDto })
  @ApiForbiddenResponse({ description: 'Недостаточно прав (MASTER, CLIENT)' })
  @ApiQuery({
    description: 'Include limits usage report',
    enum: ['usage'],
    name: 'with',
    required: false,
  })
  @CheckAbility((ability) => ability.can('read', 'Subscription'))
  async getCurrent(
    @CurrentUser() user: AuthenticatedUser,
    @Query('with') withParam?: string,
  ): Promise<SubscriptionResponseDto> {
    const tenantId = user.id as unknown as TenantId;
    const sub: SubscriptionDto = await this.queryBus.execute(
      new GetCurrentSubscriptionQuery(tenantId),
    );

    let limitsUsage: LimitsUsageReportDto | null = null;

    if (withParam === 'usage') {
      limitsUsage = await this.queryBus.execute(new GetTariffLimitsUsageQuery(tenantId));
    }

    return {
      cancelledAt: sub.cancelledAt,
      currentPeriodStartedAt: sub.currentPeriodStartedAt,
      id: sub.id,
      limitsUsage: limitsUsage
        ? {
            items: limitsUsage.items.map((item) => ({
              field: item.field,
              limit: item.limit,
              percent: item.percent,
              status: item.status,
              used: item.used,
            })),
            status: limitsUsage.status,
          }
        : null,
      nextBillingAt: sub.nextBillingAt,
      planCode: sub.planCode,
      planName: sub.planName,
      pricePerMonth: {
        amount: String(sub.planPriceCents),
        currency: 'RUB',
      },
      status: sub.status,
      trialEndsAt: sub.trialEndsAt,
    };
  }

  @Post('change-plan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Сменить тарифный план' })
  @ApiOkResponse({ description: 'План успешно изменён' })
  @ApiBadRequestResponse({ description: 'Некорректные данные' })
  @ApiConflictResponse({ description: 'Уже на этом плане (SamePlanChangeError)' })
  @ApiForbiddenResponse({ description: 'Только OWNER' })
  @CheckAbility((ability) => ability.can('update', 'Subscription'))
  async changePlan(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePlanBodyDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new ChangePlanCommand(user.id as unknown as TenantId, dto.newPlanCode, user.id as UserId),
    );
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отменить подписку' })
  @ApiOkResponse({ description: 'Подписка отменена' })
  @ApiBadRequestResponse({ description: 'Некорректные данные' })
  @ApiConflictResponse({ description: 'Подписка уже отменена' })
  @ApiForbiddenResponse({ description: 'Только OWNER' })
  @CheckAbility((ability) => ability.can('cancel', 'Subscription'))
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CancelSubscriptionBodyDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new CancelSubscriptionCommand(user.id as unknown as TenantId, dto.reason, user.id as UserId),
    );
  }

  @Get('invoices')
  @ApiOperation({ summary: 'Список счетов' })
  @ApiOkResponse({ type: [InvoiceResponseDto] })
  @ApiForbiddenResponse({ description: 'Только OWNER' })
  @CheckAbility((ability) => ability.can('read', 'Invoice'))
  async listInvoices(@CurrentUser() user: AuthenticatedUser): Promise<InvoiceResponseDto[]> {
    const tenantId = user.id as unknown as TenantId;
    const invoices: InvoiceDto[] = await this.queryBus.execute(new ListInvoicesQuery(tenantId));

    return invoices.map((inv) => ({
      amount: { amount: String(inv.amountCents), currency: inv.currency },
      id: inv.id,
      issuedAt: inv.issuedAt,
      paidAt: inv.paidAt,
      period: { endsAt: inv.periodEndsAt, startedAt: inv.periodStartedAt },
      planCode: inv.planCode,
      status: inv.status,
    }));
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Детали счёта' })
  @ApiOkResponse({ type: InvoiceResponseDto })
  @ApiNotFoundResponse({ description: 'Счёт не найден' })
  @ApiForbiddenResponse({ description: 'Только OWNER' })
  @CheckAbility((ability) => ability.can('read', 'Invoice'))
  async getInvoice(@Param('id', ParseUUIDPipe) id: string): Promise<InvoiceResponseDto> {
    const inv: InvoiceDto = await this.queryBus.execute(new GetInvoiceByIdQuery(id as InvoiceId));

    return {
      amount: { amount: String(inv.amountCents), currency: inv.currency },
      id: inv.id,
      issuedAt: inv.issuedAt,
      paidAt: inv.paidAt,
      period: { endsAt: inv.periodEndsAt, startedAt: inv.periodStartedAt },
      planCode: inv.planCode,
      status: inv.status,
    };
  }

  @Post('invoices/:id/pay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    description: 'Demo — see ADR for Phase 2 YooKassa integration',
    summary: 'Оплатить счёт (демо)',
  })
  @ApiOkResponse({ type: PayInvoiceResponseDto })
  @ApiNotFoundResponse({ description: 'Счёт не найден' })
  @ApiConflictResponse({ description: 'Счёт уже оплачен' })
  @ApiForbiddenResponse({ description: 'Только OWNER' })
  @CheckAbility((ability) => ability.can('pay', 'Subscription'))
  async payInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PayInvoiceResponseDto> {
    const result: { paymentRef: { value: string } | string; redirectUrl: string | null } =
      await this.commandBus.execute(new PayInvoiceCommand(id as InvoiceId, user.id as UserId));

    const paymentRef =
      typeof result.paymentRef === 'string' ? result.paymentRef : result.paymentRef.value;

    return {
      demoStatus: result.redirectUrl === null ? 'PAID' : 'PENDING',
      paymentRef,
      redirectUrl: result.redirectUrl,
    };
  }
}
