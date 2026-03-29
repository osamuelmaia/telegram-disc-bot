import { Module } from '@nestjs/common';
import { BotRegistryService } from './bot-registry.service';
import { BotHandlerFactory } from './bot-handler.factory';
import { BotEventsService } from './bot-events.service';
import { EndUserModule } from '../end-user/end-user.module';
import { ProductModule } from '../product/product.module';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [EndUserModule, ProductModule, OrderModule],
  providers: [BotRegistryService, BotHandlerFactory, BotEventsService],
  exports: [BotRegistryService],
})
export class BotRegistryModule {}
