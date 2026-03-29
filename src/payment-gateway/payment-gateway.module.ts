import { Global, Module } from '@nestjs/common';
import { GatewayFactoryService } from './gateway-factory.service';

@Global()
@Module({
  providers: [GatewayFactoryService],
  exports: [GatewayFactoryService],
})
export class PaymentGatewayModule {}
