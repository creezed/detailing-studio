import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { Public } from '@det/backend-iam-interfaces';

interface HealthResponse {
  readonly status: 'ok';
}

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    schema: {
      properties: {
        status: { enum: ['ok'], type: 'string' },
      },
      required: ['status'],
      type: 'object',
    },
  })
  health(): HealthResponse {
    return { status: 'ok' };
  }
}
