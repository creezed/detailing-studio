import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiNoContentResponse, ApiTags } from '@nestjs/swagger';

import { GiveConsentCommand, RevokeConsentCommand } from '@det/backend-crm-application';
import { CheckAbility } from '@det/backend-shared-auth';

import { GiveConsentRequestDto } from '../dto/client.dto';

@ApiTags('clients')
@ApiBearerAuth()
@Controller('clients/:clientId/consents')
export class ConsentsController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @CheckAbility((ability) => ability.can('create', 'Consent'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async give(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Body() dto: GiveConsentRequestDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new GiveConsentCommand(clientId, dto.type, dto.policyVersion ?? null),
    );
  }

  @Delete(':type')
  @CheckAbility((ability) => ability.can('delete', 'Consent'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async revoke(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('type') type: string,
  ): Promise<void> {
    if (type === 'PERSONAL_DATA_PROCESSING') {
      throw new UnprocessableEntityException(
        'Cannot revoke PERSONAL_DATA_PROCESSING consent directly. Use the /anonymize endpoint instead.',
      );
    }

    await this.commandBus.execute(new RevokeConsentCommand(clientId, type));
  }
}
