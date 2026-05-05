import { Module } from '@nestjs/common';

import { IamApplicationModule } from '@det/backend/iam/application';

@Module({
  imports: [IamApplicationModule],
  providers: [],
  exports: [],
})
export class IamInterfacesModule {}
