---
trigger: model_decision
description: Правила для interfaces-слоя — HTTP controllers, WebSocket gateways, DTO.
globs: ["libs/backend/*/interfaces/**/*.ts"]
---

# Interfaces layer — правила

## HTTP Controller

```ts
@Controller('work-orders')
@UseGuards(AuthGuard, AbilityGuard)
@ApiTags('work-order')
@ApiBearerAuth()
export class WorkOrderController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @CheckAbility((ab) => ab.can('list', 'WorkOrder'))
  @ApiOperation({ summary: 'List work orders' })
  @ApiOkResponse({ type: WorkOrderListItemResponseDto, isArray: true })
  list(@Query() q: ListWorkOrdersRequestDto): Promise<WorkOrderListItemResponseDto[]> {
    return this.queryBus.execute(new ListWorkOrdersQuery(q));
  }

  @Post(':id/close')
  @CheckAbility((ab, ctx) => ab.can('close', subject('WorkOrder', { id: ctx.params.id })))
  @ApiOperation({ summary: 'Close work order' })
  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  async close(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.commandBus.execute(new CloseWorkOrderCommand({
      workOrderId: id,
      actorId: user.id,
    }));
  }
}
```

**Правила:**
- Контроллер — **тонкий**. Только: распарсить вход → вызвать commandBus/queryBus → вернуть.
- Никакой бизнес-логики, никаких прямых вызовов репозиториев.
- Все эндпоинты защищены `AuthGuard` + `AbilityGuard` (CASL).
- Каждый эндпоинт документирован Swagger-декораторами (`@ApiOperation`, `@ApiResponse`, `@ApiParam`, `@ApiQuery`).

## DTO

### Request DTO

```ts
export class ListWorkOrdersRequestDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ enum: WorkOrderStatusEnum, isArray: true })
  @IsOptional()
  @IsEnum(WorkOrderStatusEnum, { each: true })
  status?: WorkOrderStatusEnum[];

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;
}
```

### Response DTO

```ts
export class WorkOrderListItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: WorkOrderStatusEnum })
  status!: WorkOrderStatusEnum;

  @ApiProperty({ format: 'date-time' })
  openedAt!: string;

  @ApiPropertyOptional({ format: 'date-time' })
  closedAt?: string | null;
}
```

**Правила:**
- Каждое поле декорировано `@ApiProperty` / `@ApiPropertyOptional`.
- Валидация через `class-validator`.
- Нет вычислимых свойств / методов в DTO. Только данные.
- Имя файла — `*.dto.ts`.

## Ошибки

- Все ошибки идут через `GlobalExceptionFilter`, превращаются в RFC 7807 Problem Details.
- В контроллерах **запрещено** ловить ошибки и возвращать самодельные ответы.

## WebSocket

```ts
@WebSocketGateway({ namespace: 'schedule' })
@UseGuards(WsAuthGuard)
export class ScheduleGateway {
  @WebSocketServer() server!: Server;

  @SubscribeMessage('subscribe')
  handleSubscribe(@ConnectedSocket() client: Socket, @MessageBody() body: SubscribeBody): void {
    client.join(`branch:${body.branchId}`);
  }

  @OnEvent('AppointmentCreated')
  broadcastCreated(event: AppointmentCreated): void {
    this.server.to(`branch:${event.branchId}`).emit('appointmentCreated', toDto(event));
  }
}
```

## Запрещено

- Доступ к `EntityManager` или `Repository` напрямую из контроллера.
- Бизнес-логика в контроллере.
- `try/catch` без re-throw в контроллере (ошибки обрабатываются глобально).
- Возврат ошибок как `{ error: '...' }` — только через выброс типизированных исключений.
- `@Body() any` или `@Body() Record<string, unknown>` без DTO.
