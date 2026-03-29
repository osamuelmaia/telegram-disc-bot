import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AccessStatus, BillingInterval, OrderStatus, ProductType, SubscriptionStatus } from '@prisma/client';
import { PaginationDto } from '../common/dto/pagination.dto';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── Dashboard ──────────────────────────────────────────────────────────────

  @Get('dashboard/stats')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // ── Orders ──────────────────────────────────────────────────────────────────

  @Get('orders')
  findOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Query('search') search?: string,
  ) {
    const pagination = this.buildPagination(page, limit);
    return this.adminService.findOrders(
      {
        status: status as OrderStatus | undefined,
        userId,
        search,
      },
      pagination,
    );
  }

  @Get('orders/:id')
  async findOrderById(@Param('id') id: string) {
    const order = await this.adminService.findOrderById(id);
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  // ── Subscriptions ───────────────────────────────────────────────────────────

  @Get('subscriptions')
  findSubscriptions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
  ) {
    const pagination = this.buildPagination(page, limit);
    return this.adminService.findSubscriptions(
      { status: status as SubscriptionStatus | undefined, userId },
      pagination,
    );
  }

  @Get('subscriptions/:id')
  async findSubscriptionById(@Param('id') id: string) {
    const sub = await this.adminService.findSubscriptionById(id);
    if (!sub) throw new NotFoundException(`Subscription ${id} not found`);
    return sub;
  }

  @Post('subscriptions/:id/cancel')
  cancelSubscription(
    @Param('id') id: string,
    @Body() body: { immediately?: boolean },
  ) {
    return this.adminService.cancelSubscription(id, body.immediately ?? false);
  }

  // ── Customers ───────────────────────────────────────────────────────────────

  @Get('customers')
  findCustomers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const pagination = this.buildPagination(page, limit);
    return this.adminService.findCustomers({ search }, pagination);
  }

  @Get('customers/:id')
  async findCustomerById(@Param('id') id: string) {
    const customer = await this.adminService.findCustomerById(id);
    if (!customer) throw new NotFoundException(`Customer ${id} not found`);
    return customer;
  }

  // ── Products ────────────────────────────────────────────────────────────────

  @Get('products')
  findProducts(@Query('page') page?: string, @Query('limit') limit?: string) {
    const pagination = this.buildPagination(page, limit);
    return this.adminService.findProducts(pagination);
  }

  @Post('products')
  createProduct(
    @Body()
    body: {
      name: string;
      description?: string;
      type: ProductType;
      price: number;
      currency?: string;
      billingInterval?: BillingInterval;
      trialDays?: number;
      chatId?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    return this.adminService.createProduct(body);
  }

  @Patch('products/:id')
  updateProduct(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      price?: number;
      billingInterval?: BillingInterval;
      trialDays?: number;
      chatId?: string;
      active?: boolean;
      metadata?: Record<string, unknown>;
    },
  ) {
    return this.adminService.updateProduct(id, body);
  }

  @Delete('products/:id')
  deleteProduct(@Param('id') id: string) {
    return this.adminService.deleteProduct(id);
  }

  // ── Accesses ────────────────────────────────────────────────────────────────

  @Get('accesses')
  findAccesses(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('productId') productId?: string,
    @Query('status') status?: string,
  ) {
    const pagination = this.buildPagination(page, limit);
    return this.adminService.findAccesses(
      { userId, productId, status: status as AccessStatus | undefined },
      pagination,
    );
  }

  @Post('accesses/grant')
  grantAccess(
    @Body() body: { userId: string; productId: string; chatId: string; expiresAt?: string },
  ) {
    return this.adminService.grantAccess({
      ...body,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    });
  }

  @Post('accesses/:id/revoke')
  revokeAccess(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.adminService.revokeAccess(id, body.reason);
  }

  // ── Webhooks ────────────────────────────────────────────────────────────────

  @Get('webhooks/failed')
  findFailedWebhooks(@Query('page') page?: string, @Query('limit') limit?: string) {
    const pagination = this.buildPagination(page, limit);
    return this.adminService.findFailedWebhooks(pagination);
  }

  @Post('webhooks/:id/retry')
  retryWebhook(@Param('id') id: string) {
    return this.adminService.retryWebhook(id);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private buildPagination(page?: string, limit?: string): PaginationDto {
    const dto = new PaginationDto();
    if (page) dto.page = Math.max(1, parseInt(page, 10) || 1);
    if (limit) dto.limit = Math.max(1, parseInt(limit, 10) || 20);
    return dto;
  }
}
