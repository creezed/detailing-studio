import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { OutboxEventSchema } from './outbox-event.schema';
import { OutboxService } from './outbox.service';

@Module({
  exports: [OutboxService],
  imports: [MikroOrmModule.forFeature([OutboxEventSchema])],
  providers: [OutboxService],
})
export class OutboxModule {}
