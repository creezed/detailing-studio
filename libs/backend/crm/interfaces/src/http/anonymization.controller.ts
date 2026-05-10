import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import {
  CancelAnonymizationRequestCommand,
  RequestClientAnonymizationCommand,
} from '@det/backend-crm-application';
import { CheckAbility } from '@det/backend-shared-auth';
import type { AuthenticatedUser } from '@det/backend-shared-auth';

import { CurrentUser } from '../decorators/current-user.decorator';
import { CancelAnonymizationDto, RequestAnonymizationDto } from '../dto/client.dto';

@ApiTags('clients')
@ApiBearerAuth()
@Controller('clients/:clientId/anonymization-requests')
export class AnonymizationController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @CheckAbility((ability) => ability.can('anonymize', 'Client'))
  @ApiOkResponse()
  async request(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RequestAnonymizationDto,
  ): Promise<{ id: string }> {
    const id = await this.commandBus.execute<RequestClientAnonymizationCommand, string>(
      new RequestClientAnonymizationCommand(
        clientId,
        user.role as 'CLIENT' | 'MANAGER' | 'OWNER',
        dto.reason,
      ),
    );

    return { id };
  }

  @Delete(':requestId')
  @CheckAbility((ability) => ability.can('anonymize', 'Client'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async cancel(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CancelAnonymizationDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new CancelAnonymizationRequestCommand(requestId, user.id, dto.reason),
    );
  }
}
