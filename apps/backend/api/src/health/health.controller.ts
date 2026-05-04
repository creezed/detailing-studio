import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

interface HealthResponse {
  readonly status: 'ok';
}

@ApiTags('health')
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
