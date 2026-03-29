import { Injectable, NotFoundException } from '@nestjs/common';
import { AccessStatus, OrderStatus, Prisma, SubscriptionStatus, TenantStatus, WithdrawalStatus } from '@prisma/client';
import { PaginatedResult, paginate } from '../common/dto/paginated-result.type';
import { WalletService } from '../wallet/wallet.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';

// ── Filters ─────────────────────────────────────────────────────────────────

export interface FindOrdersFilter {
  status?: OrderStatus;
  endUserId?: string;
  search?: string;
}

export interface FindSubscriptionsFilter {
  status?: SubscriptionStatus;
  endUserId?: string;
}

export interface FindCustomersFilter {
  search?: string;
}

export interface FindAccessesAdminFilter {
  endUserId?: string;
  productId?: string;
  status?: AccessStatus;
}

// ── Dashboard types ──────────────────────────────────────────────────────────

export interface DashboardStats {
  revenue: { today: number; thisMonth: number; total: number };
  orders: { total: number; paid: number; pending: number; failed: number };
  subscriptions: { active: number; trialing: number; pastDue: number; cancelled: number };
  customers: { total: number; newToday: number; newThisMonth: number };
  accesses: { active: number; revoked: number };
  webhooks: { failed: number };
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {}

  // ── Dashboard ──────────────────────────────────────────────────────────────

  async getDashboardStats(): Promise<DashboardStats> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      revenueToday,
      revenueMonth,
      revenueTotal,
      orderTotal,
      orderPaid,
      orderPending,
      orderFailed,
      subActive,
      subTrialing,
      subPastDue,
      subCancelled,
      customerTotal,
      customerToday,
      customerMonth,
      accessActive,
      accessRevoked,
      webhookFailed,
    ] = await Promise.all([
      this.prisma.order.aggregate({ where: { status: OrderStatus.PAID, paidAt: { gte: todayStart } }, _sum: { amount: true } }),
      this.prisma.order.aggregate({ where: { status: OrderStatus.PAID, paidAt: { gte: monthStart } }, _sum: { amount: true } }),
      this.prisma.order.aggregate({ where: { status: OrderStatus.PAID }, _sum: { amount: true } }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: OrderStatus.PAID } }),
      this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      this.prisma.order.count({ where: { status: OrderStatus.FAILED } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.TRIALING } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.PAST_DUE } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.CANCELLED } }),
      this.prisma.endUser.count(),
      this.prisma.endUser.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.endUser.count({ where: { createdAt: { gte: monthStart } } }),
      this.prisma.access.count({ where: { status: AccessStatus.ACTIVE } }),
      this.prisma.access.count({ where: { status: AccessStatus.REVOKED } }),
      this.prisma.webhookEvent.count({ where: { status: 'FAILED' } }),
    ]);

    const toNum = (d: Prisma.Decimal | null) => Number(d?.toString() ?? 0);

    return {
      revenue: {
        today: toNum(revenueToday._sum.amount),
        thisMonth: toNum(revenueMonth._sum.amount),
        total: toNum(revenueTotal._sum.amount),
      },
      orders: { total: orderTotal, paid: orderPaid, pending: orderPending, failed: orderFailed },
      subscriptions: { active: subActive, trialing: subTrialing, pastDue: subPastDue, cancelled: subCancelled },
      customers: { total: customerTotal, newToday: customerToday, newThisMonth: customerMonth },
      accesses: { active: accessActive, revoked: accessRevoked },
      webhooks: { failed: webhookFailed },
    };
  }

  // ── Orders ──────────────────────────────────────────────────────────────────

  async findOrders(filter: FindOrdersFilter, pagination: PaginationDto): Promise<PaginatedResult<object>> {
    const where: Prisma.OrderWhereInput = {};
    if (filter.status) where.status = filter.status;
    if (filter.endUserId) where.endUserId = filter.endUserId;
    if (filter.search) {
      where.OR = [
        { id: { contains: filter.search } },
        { endUser: { username: { contains: filter.search, mode: 'insensitive' } } },
        { endUser: { firstName: { contains: filter.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
        include: {
          endUser: { select: { telegramId: true, username: true, firstName: true } },
          product: { select: { name: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return paginate(data, total, pagination.page, pagination.take);
  }

  async findOrderById(id: string): Promise<object | null> {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        endUser: { select: { id: true, telegramId: true, username: true, firstName: true, lastName: true } },
        product: { select: { id: true, name: true, type: true } },
        access: { select: { id: true, status: true, inviteLink: true, grantedAt: true } },
      },
    });
  }

  // ── Subscriptions ───────────────────────────────────────────────────────────

  async findSubscriptions(filter: FindSubscriptionsFilter, pagination: PaginationDto): Promise<PaginatedResult<object>> {
    const where: Prisma.SubscriptionWhereInput = {};
    if (filter.status) where.status = filter.status;
    if (filter.endUserId) where.endUserId = filter.endUserId;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.subscription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
        include: {
          endUser: { select: { telegramId: true, username: true, firstName: true } },
          product: { select: { name: true, price: true } },
        },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return paginate(data, total, pagination.page, pagination.take);
  }

  async findSubscriptionById(id: string): Promise<object | null> {
    return this.prisma.subscription.findUnique({
      where: { id },
      include: {
        endUser: { select: { id: true, telegramId: true, username: true, firstName: true } },
        product: { select: { id: true, name: true, price: true, billingInterval: true } },
        access: { select: { id: true, status: true, revokedAt: true } },
        payments: { orderBy: { createdAt: 'desc' }, take: 12 },
      },
    });
  }

  // ── Customers ───────────────────────────────────────────────────────────────

  async findCustomers(filter: FindCustomersFilter, pagination: PaginationDto): Promise<PaginatedResult<object>> {
    const where: Prisma.EndUserWhereInput = {};
    if (filter.search) {
      const term = filter.search.trim();
      where.OR = [
        { username: { contains: term, mode: 'insensitive' } },
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.endUser.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
        include: {
          _count: { select: { orders: true, subscriptions: true, accesses: true } },
        },
      }),
      this.prisma.endUser.count({ where }),
    ]);

    return paginate(data, total, pagination.page, pagination.take);
  }

  async findCustomerById(id: string): Promise<object | null> {
    return this.prisma.endUser.findUnique({
      where: { id },
      include: {
        orders: { orderBy: { createdAt: 'desc' }, take: 10, include: { product: { select: { name: true } } } },
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 5, include: { product: { select: { name: true } } } },
        accesses: { orderBy: { grantedAt: 'desc' }, include: { product: { select: { name: true } } } },
        _count: { select: { orders: true, subscriptions: true, accesses: true } },
      },
    });
  }

  // ── Products ────────────────────────────────────────────────────────────────

  async findProducts(pagination: PaginationDto): Promise<PaginatedResult<object>> {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
        include: {
          _count: { select: { orders: true, subscriptions: true, accesses: true } },
        },
      }),
      this.prisma.product.count(),
    ]);

    return paginate(data, total, pagination.page, pagination.take);
  }

  createProduct(dto: { name: string; description?: string; type: any; price: number; currency?: string; billingInterval?: any; trialDays?: number; chatId?: string; tenantId: string }) {
    return this.prisma.product.create({ data: dto });
  }

  updateProduct(id: string, dto: Partial<{ name: string; description: string; price: number; billingInterval: any; trialDays: number; chatId: string; active: boolean }>) {
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  softDeleteProduct(id: string) {
    return this.prisma.product.update({ where: { id }, data: { active: false } });
  }

  // ── Accesses ────────────────────────────────────────────────────────────────

  async findAccesses(filter: FindAccessesAdminFilter, pagination: PaginationDto): Promise<PaginatedResult<object>> {
    const where: Prisma.AccessWhereInput = {};
    if (filter.endUserId) where.endUserId = filter.endUserId;
    if (filter.productId) where.productId = filter.productId;
    if (filter.status) where.status = filter.status;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.access.findMany({
        where,
        orderBy: { grantedAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
        include: {
          endUser: { select: { telegramId: true, username: true, firstName: true } },
          product: { select: { name: true } },
        },
      }),
      this.prisma.access.count({ where }),
    ]);

    return paginate(data, total, pagination.page, pagination.take);
  }

  revokeAccess(accessId: string, reason: string) {
    return this.prisma.access.update({
      where: { id: accessId },
      data: { status: AccessStatus.REVOKED, revokedAt: new Date(), revokedReason: reason },
    });
  }

  // ── Webhooks ────────────────────────────────────────────────────────────────

  async findFailedWebhooks(pagination: PaginationDto): Promise<PaginatedResult<object>> {
    const where = { status: 'FAILED' as any };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.webhookEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.webhookEvent.count({ where }),
    ]);
    return paginate(data, total, pagination.page, pagination.take);
  }

  // ── Tenants ────────────────────────────────────────────────────────────────

  async findTenants(
    filters: { status?: TenantStatus; search?: string },
    pagination: PaginationDto,
  ): Promise<PaginatedResult<object>> {
    const where: Prisma.TenantWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.tenant.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
        select: {
          id: true, name: true, email: true, status: true,
          platformFeePercent: true, cardReleaseDays: true, createdAt: true,
          _count: { select: { products: true, orders: true, subscriptions: true, endUsers: true } },
        },
      }),
      this.prisma.tenant.count({ where }),
    ]);
    return paginate(data, total, pagination.page, pagination.take);
  }

  async findTenantById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, status: true,
        pixKeyType: true, pixKeyValue: true, platformFeePercent: true,
        createdAt: true, updatedAt: true,
        bot: { select: { username: true, status: true } },
        wallet: { select: { balance: true, totalReceived: true, totalFees: true, totalWithdrawn: true } },
        paymentGatewayConfigs: { select: { gateway: true, active: true, createdAt: true } },
        _count: { select: { products: true, orders: true, endUsers: true, subscriptions: true } },
      },
    });
    if (!tenant) throw new NotFoundException(`Tenant ${id} not found`);
    return tenant;
  }

  updateTenantStatus(id: string, status: TenantStatus) {
    return this.prisma.tenant.update({
      where: { id },
      data: { status },
      select: { id: true, name: true, status: true },
    });
  }

  updateTenantFee(id: string, feePercent: number) {
    return this.prisma.tenant.update({
      where: { id },
      data: { platformFeePercent: feePercent },
      select: { id: true, name: true, platformFeePercent: true },
    });
  }

  updateTenantSettings(id: string, dto: { feePercent?: number; cardReleaseDays?: number }) {
    const data: Record<string, unknown> = {};
    if (dto.feePercent !== undefined) data.platformFeePercent = dto.feePercent;
    if (dto.cardReleaseDays !== undefined) data.cardReleaseDays = dto.cardReleaseDays;
    return this.prisma.tenant.update({
      where: { id },
      data,
      select: { id: true, name: true, platformFeePercent: true, cardReleaseDays: true },
    });
  }

  // ── Platform config ────────────────────────────────────────────────────────

  async getPlatformConfig() {
    const config = await this.prisma.platformConfig.findFirst();
    if (!config) {
      return this.prisma.platformConfig.create({
        data: { defaultFeePercent: 0.05, minWithdrawalAmount: 50 },
      });
    }
    return config;
  }

  updatePlatformConfig(dto: { defaultFeePercent?: number; minWithdrawalAmount?: number; notificationEmail?: string }) {
    return this.prisma.platformConfig.updateMany({ data: dto as any });
  }

  // ── Saques ────────────────────────────────────────────────────────────────

  async findWithdrawals(
    filters: { status?: WithdrawalStatus },
    pagination: PaginationDto,
  ): Promise<PaginatedResult<object>> {
    const where: Prisma.WithdrawalRequestWhereInput = {};
    if (filters.status) where.status = filters.status;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.withdrawalRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
        include: {
          tenant: { select: { name: true, email: true } },
        },
      }),
      this.prisma.withdrawalRequest.count({ where }),
    ]);
    return paginate(data, total, pagination.page, pagination.take);
  }

  async approveWithdrawal(id: string) {
    const withdrawal = await this.prisma.withdrawalRequest.findUnique({ where: { id } });
    if (!withdrawal) throw new NotFoundException(`Withdrawal ${id} not found`);

    return this.prisma.withdrawalRequest.update({
      where: { id },
      data: { status: WithdrawalStatus.APPROVED, approvedAt: new Date() },
    });
  }

  async rejectWithdrawal(id: string, reason: string) {
    const withdrawal = await this.prisma.withdrawalRequest.findUnique({ where: { id } });
    if (!withdrawal) throw new NotFoundException(`Withdrawal ${id} not found`);

    // Reverte o saldo na carteira do tenant
    await this.walletService.reverseWithdrawal(withdrawal.tenantId, id);

    return this.prisma.withdrawalRequest.update({
      where: { id },
      data: {
        status: WithdrawalStatus.REJECTED,
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    });
  }
}
