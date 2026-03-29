import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PaymentGateway } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { DashboardService } from './dashboard.service';

// =============================================================================
// DashboardController — Portal do tenant (JWT obrigatório)
// =============================================================================
// Prefixo: /dashboard
// Todos os endpoints são escopados ao tenant autenticado via JWT.
// =============================================================================

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // ── Perfil ─────────────────────────────────────────────────────────────────

  @Get('me')
  getProfile(@CurrentTenant() tenant: { id: string }) {
    return this.dashboardService.getProfile(tenant.id);
  }

  @Patch('me')
  updateProfile(
    @CurrentTenant() tenant: { id: string },
    @Body() body: { name?: string; pixKeyType?: string; pixKeyValue?: string },
  ) {
    return this.dashboardService.updateProfile(tenant.id, body);
  }

  // ── Bot ────────────────────────────────────────────────────────────────────

  @Get('bot')
  getBot(@CurrentTenant() tenant: { id: string }) {
    return this.dashboardService.getBot(tenant.id);
  }

  @Put('bot')
  upsertBot(
    @CurrentTenant() tenant: { id: string },
    @Body() body: { token: string; welcomeMessage?: string; supportContact?: string },
  ) {
    return this.dashboardService.upsertBot(tenant.id, body);
  }

  // ── Gateways ───────────────────────────────────────────────────────────────

  @Get('gateways')
  getGateways(@CurrentTenant() tenant: { id: string }) {
    return this.dashboardService.getGateways(tenant.id);
  }

  @Put('gateways/:type')
  upsertGateway(
    @CurrentTenant() tenant: { id: string },
    @Param('type') type: PaymentGateway,
    @Body() body: { credentials: Record<string, unknown>; active?: boolean },
  ) {
    return this.dashboardService.upsertGateway(
      tenant.id,
      type,
      body.credentials,
      body.active ?? true,
    );
  }

  // ── Produtos ───────────────────────────────────────────────────────────────

  @Get('products')
  getProducts(
    @CurrentTenant() tenant: { id: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.dashboardService.getProducts(tenant.id, this.pagination(page, limit));
  }

  @Post('products')
  createProduct(
    @CurrentTenant() tenant: { id: string },
    @Body() body: {
      name: string;
      description?: string;
      type: 'ONE_TIME' | 'RECURRING';
      price: number;
      currency?: string;
      billingInterval?: 'MONTHLY' | 'YEARLY';
      trialDays?: number;
      chatId?: string;
    },
  ) {
    return this.dashboardService.createProduct(tenant.id, body);
  }

  @Patch('products/:id')
  updateProduct(
    @CurrentTenant() tenant: { id: string },
    @Param('id') id: string,
    @Body() body: {
      name?: string; description?: string; price?: number;
      chatId?: string; active?: boolean; billingInterval?: string; trialDays?: number;
    },
  ) {
    return this.dashboardService.updateProduct(tenant.id, id, body);
  }

  @Delete('products/:id')
  deleteProduct(@CurrentTenant() tenant: { id: string }, @Param('id') id: string) {
    return this.dashboardService.deleteProduct(tenant.id, id);
  }

  // ── Pedidos ────────────────────────────────────────────────────────────────

  @Get('orders')
  getOrders(
    @CurrentTenant() tenant: { id: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.dashboardService.getOrders(
      tenant.id,
      { status, search },
      this.pagination(page, limit),
    );
  }

  @Get('orders/:id')
  getOrder(@CurrentTenant() tenant: { id: string }, @Param('id') id: string) {
    return this.dashboardService.getOrder(tenant.id, id);
  }

  // ── Assinaturas ────────────────────────────────────────────────────────────

  @Get('subscriptions')
  getSubscriptions(
    @CurrentTenant() tenant: { id: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.dashboardService.getSubscriptions(
      tenant.id,
      { status },
      this.pagination(page, limit),
    );
  }

  @Get('subscriptions/:id')
  getSubscription(@CurrentTenant() tenant: { id: string }, @Param('id') id: string) {
    return this.dashboardService.getSubscription(tenant.id, id);
  }

  // ── Carteira ───────────────────────────────────────────────────────────────

  @Get('wallet')
  getWallet(@CurrentTenant() tenant: { id: string }) {
    return this.dashboardService.getWallet(tenant.id);
  }

  @Get('wallet/transactions')
  getWalletTransactions(
    @CurrentTenant() tenant: { id: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.dashboardService.getWalletTransactions(tenant.id, this.pagination(page, limit));
  }

  @Post('wallet/withdraw')
  requestWithdrawal(
    @CurrentTenant() tenant: { id: string },
    @Body() body: { amount: number },
  ) {
    return this.dashboardService.requestWithdrawal(tenant.id, body.amount);
  }

  @Get('withdrawals')
  getWithdrawals(
    @CurrentTenant() tenant: { id: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.dashboardService.getWithdrawals(tenant.id, this.pagination(page, limit));
  }

  // ── Helper ─────────────────────────────────────────────────────────────────

  private pagination(page?: string, limit?: string): PaginationDto {
    const dto = new PaginationDto();
    if (page) dto.page = Math.max(1, parseInt(page, 10) || 1);
    if (limit) dto.limit = Math.max(1, parseInt(limit, 10) || 20);
    return dto;
  }
}
