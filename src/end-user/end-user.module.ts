import { Module } from '@nestjs/common';
import { EndUserService } from './end-user.service';

@Module({
  providers: [EndUserService],
  exports: [EndUserService],
})
export class EndUserModule {}
