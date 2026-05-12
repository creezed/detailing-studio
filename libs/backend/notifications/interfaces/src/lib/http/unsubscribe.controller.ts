import { Controller, Get, Headers, HttpCode, HttpStatus, Query, Res } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { GlobalUnsubscribeCommand } from '@det/backend-notifications-application';
import { Public } from '@det/backend-shared-auth';
import { DateTime } from '@det/backend-shared-ddd';

import { UnsubscribeQueryDto } from '../dto/notification.dto';

import type { FastifyReply } from 'fastify';

@ApiTags('Notifications')
@Controller('unsubscribe')
export class UnsubscribeController {
  constructor(private readonly commandBus: CommandBus) {}

  @Get()
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отписка от уведомлений по токену' })
  @ApiOkResponse({ description: 'Успешная отписка' })
  @ApiBadRequestResponse({ description: 'Некорректный или истёкший токен' })
  async unsubscribe(
    @Query() q: UnsubscribeQueryDto,
    @Headers('accept') accept: string | undefined,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    await this.commandBus.execute(new GlobalUnsubscribeCommand(q.token, DateTime.now()));

    const wantsJson =
      accept?.includes('application/json') === true && !accept.includes('text/html');

    if (wantsJson) {
      await reply.status(HttpStatus.OK).send({ ok: true, message: 'Вы отписаны' });
    } else {
      await reply
        .status(HttpStatus.OK)
        .header('content-type', 'text/html; charset=utf-8')
        .send(
          '<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Отписка</title></head>' +
            '<body style="font-family:sans-serif;text-align:center;padding:3rem">' +
            '<h1>Вы успешно отписаны</h1>' +
            '<p>Вы больше не будете получать уведомления по этому каналу.</p>' +
            '</body></html>',
        );
    }
  }
}
