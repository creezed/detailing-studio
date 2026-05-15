import { Module } from '@nestjs/common';

import { SubscriptionController } from './controllers/subscription.controller';

@Module({
  controllers: [SubscriptionController],
})
export class BillingHttpModule {}
