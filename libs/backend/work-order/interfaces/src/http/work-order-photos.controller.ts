import {
  BadRequestException,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  PayloadTooLargeException,
  Post,
  Req,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CheckAbility, CurrentUser } from '@det/backend-shared-auth';
import type { AuthenticatedUser } from '@det/backend-shared-auth';
import { AddPhotoCommand, RemovePhotoCommand } from '@det/backend-work-order-application';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { MultipartFile } from '@fastify/multipart';
import type { FastifyRequest } from 'fastify';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

@ApiTags('work-orders')
@ApiBearerAuth()
@Controller('work-orders/:workOrderId/photos')
export class WorkOrderPhotosController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('before')
  @CheckAbility((ab) => ab.can('add-photo', 'WorkOrder'))
  @ApiOperation({ summary: 'Загрузить фото «до»' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiCreatedResponse({ description: 'ID загруженного фото' })
  async uploadBefore(
    @Param('workOrderId', ParseUUIDPipe) workOrderId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: FastifyRequest,
  ): Promise<{ id: string }> {
    return this.handleUpload(workOrderId, 'BEFORE', user.id, req);
  }

  @Post('after')
  @CheckAbility((ab) => ab.can('add-photo', 'WorkOrder'))
  @ApiOperation({ summary: 'Загрузить фото «после»' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiCreatedResponse({ description: 'ID загруженного фото' })
  async uploadAfter(
    @Param('workOrderId', ParseUUIDPipe) workOrderId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: FastifyRequest,
  ): Promise<{ id: string }> {
    return this.handleUpload(workOrderId, 'AFTER', user.id, req);
  }

  @Delete(':photoId')
  @CheckAbility((ab) => ab.can('remove-photo', 'WorkOrder'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить фото' })
  @ApiNoContentResponse()
  async remove(
    @Param('workOrderId', ParseUUIDPipe) workOrderId: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.commandBus.execute(new RemovePhotoCommand(workOrderId, photoId, user.id));
  }

  private async handleUpload(
    workOrderId: string,
    type: 'BEFORE' | 'AFTER',
    userId: string,
    req: FastifyRequest,
  ): Promise<{ id: string }> {
    const file = await req.file({ limits: { fileSize: MAX_FILE_SIZE } });

    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!ALLOWED_MIMES.has(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported mime type: ${file.mimetype}. Allowed: ${[...ALLOWED_MIMES].join(', ')}`,
      );
    }

    const buffer = await file.toBuffer();

    if (buffer.byteLength > MAX_FILE_SIZE) {
      throw new PayloadTooLargeException(
        `File size ${String(buffer.byteLength)} exceeds limit of ${String(MAX_FILE_SIZE)} bytes`,
      );
    }

    const id: string = await this.commandBus.execute(
      new AddPhotoCommand(workOrderId, type, buffer, file.mimetype, userId),
    );

    return { id };
  }
}
