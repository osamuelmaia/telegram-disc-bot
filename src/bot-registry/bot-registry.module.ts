import { Module } from '@nestjs/common';
import { BotRegistryService } from './bot-registry.service';
import { BotHandlerFactory } from './bot-handler.factory';
import { EndUserModule } from '../end-user/end-user.module';
import { ProductModule } from '../product/product.module';

@Module({
  imports: [EndUserModule, ProductModule],
  providers: [BotRegistryService, BotHandlerFactory],
  exports: [BotRegistryService],
})
export class BotRegistryModule {}
