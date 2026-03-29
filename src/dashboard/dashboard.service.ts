import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentGateway, Prisma, WithdrawalStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { FieldEncryptionService } from '../common/crypto/field-encryption.service';
import { GatewayFactoryService } from '../payment-gateway/gateway-factory.service';
import { BotRegistryService } from '../bot-registry/bot-registry.service';
import { WalletService } from '../wallet/wallet.service';
import { paginate, PaginatedResult } from '../common/dto/paginated-result.type';
import { PaginationDto } from '../common/dto/pagination.dto';

// =============================================================================
// DashboardService — APIs de autoatendimento do tenant
// =============================================================================

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: FieldEncryptionService,
    private readonly gatewayFactory: GatewayFactoryService,
    private readonly botRegistry: BotRegistryService,
    private readonly walletService: WalletService,
  ) {}

  // ── Perfil ─────────────────────────────────────────────────────────────────

  async getProfile(tenantId: string) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        pixKeyType: true,
        pixKeyValue: true,
        platformFeePercent: true,
        personType: true,
        document: true,
        birthDate: true,
        zipCode: true,
        address: true,
        profileCompleted: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return tenant;
  }

  async updateProfile(
    tenantId: string,
    dto: {
      name?: string;
      pixKeyType?: string;
      pixKeyValue?: string;
      personType?: string;
      document?: string;
      birthDate?: string;
      zipCode?: string;
      address?: string;
      profileCompleted?: boolean;
    },
  ) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: dto,
      select: {
        id: true, name: true, email: true, pixKeyType: true, pixKeyValue: true,
        personType: true, document: true, birthDate: true, zipCode: true, address: true,
        profileCompleted: true, updatedAt: true,
      },
    });
  }

  // ── Bot ────────────────────────────────────────────────────────────────────

  async getBot(tenantId: string) {
    return this.prisma.bot.findUnique({
      where: { tenantId },
      select: {
        id: true,
        username: true,
        status: true,
        welcomeMessage: true,
        supportContact: true,
        createdAt: true,
        updatedAt: true,
        // token omitido propositalmente
      },
    });
  }

  async upsertBot(
    tenantId: string,
    dto: { token: string; welcomeMessage?: string; supportContact?: string },
  ) {
    // Upsert do registro no banco primeiro
    await this.prisma.bot.upsert({
      where: { tenantId },
      create: {
        tenantId,
        token: dto.token,
        welcomeMessage: dto.welcomeMessage,
        supportContact: dto.supportContact,
        status: 'INACTIVE',
      },
      update: {
        token: dto.token,
        welcomeMessage: dto.welcomeMessage,
        supportContact: dto.supportContact,
      },
    });

    // Registra (ou reinicia) o bot no registry
    await this.botRegistry.register(tenantId, dto.token);

    return this.getBot(tenantId);
  }

  // ── Gateways ───────────────────────────────────────────────────────────────

  async getGateways(tenantId: string) {
    const configs = await this.prisma.paymentGatewayConfig.findMany({
      where: { tenantId },
      select: { id: true, gateway: true, active: true, createdAt: true, updatedAt: true },
      // credentials omitidas propositalmente
    });
    return configs;
  }

  async upsertGateway(
    tenantId: string,
    type: PaymentGateway,
    credentials: Record<string, unknown>,
    active = true,
  ) {
    const encrypted = this.crypto.encrypt(JSON.stringify(credentials));

    const config = await this.prisma.paymentGatewayConfig.upsert({
      where: { tenantId_gateway: { tenantId, gateway: type } },
      create: { tenantId, gateway: type, active, credentials: encrypted },
      update: { active, credentials: encrypted },
      select: { id: true, gateway: true, active: true, updatedAt: true },
    });

    // Invalida o cache para forçar recriação com novas credenciais
    this.gatewayFactory.invalidate(tenantId, type);

    return config;
  }

  // ── Produtos ───────────────────────────────────────────────────────────────

  async getProducts(tenantId: string, pagination: PaginationDto): Promise<PaginatedResult<object>> {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
        include: {
          _count: { select: { orders: true, subscriptions: true, accesses: true } },
        },
      }),
      this.prisma.product.count({ where: { tenantId } }),
    ]);
    return paginate(data, total, pagination.page, pagination.take);
  }

  createProduct(tenantId: string, dto: {
    name: string;
    description?: string;
    type: 'ONE_TIME' | 'RECURRING';
    price: number;
    currency?: string;
    billingInterval?: 'MONTHLY' | 'YEARLY';
    trialDays?: number;
    chatId?: string;
  }) {
    return this.prisma.product.create({ data: { tenantId, ...dto } });
  }

  async updateProduct(tenantId: string, id: string, dto: Partial<{
    name: string; description: string; price: number;
    chatId: string; active: boolean; billingInterval: string; trialDays: number;
  }>) {
    const result = await this.prisma.product.updateMany({ where: { id, tenantId }, data: dto as any });
    if (result.count === 0) throw new NotFoundException('Produto não encontrado');
    return this.prisma.product.findFirst({ where: { id, tenantId } });
  }

  async deleteProduct(tenantId: string, id: string) {
    const result = await this.prisma.product.updateMany({ where: { id, tenantId }, data: { active: false } });
    if (result.count === 0) throw new NotFoundException('Produto não encontrado');
    return { deleted: true };
  }

  // ── Pedidos ────────────────────────────────────────────────────────────────

  async getOrders(
    tenantId: string,
    filters: { status?: string; search?: string },
    pagination: PaginationDto,
  ): Promise<PaginatedResult<object>> {
    const where: Prisma.OrderWhereInput = { tenantId };
    if (filters.status) where.status = filters.status as any;
    if (filters.search) {
      where.OR = [
        { endUser: { username: { contains: filters.search, mode: 'insensitive' } } },
        { endUser: { firstName: { contains: filters.search, mode: 'insensitive' } } },
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

  async getOrder(tenantId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, tenantId },
      include: {
        endUser: { select: { id: true, telegramId: true, username: true, firstName: true } },
        product: { select: { id: true, name: true, type: true } },
        access: { select: { id: true, status: true, inviteLink: true, grantedAt: true } },
      },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado');
    return order;
  }

  // ── Assinaturas ────────────────────────────────────────────────────────────

  async getSubscriptions(
    tenantId: string,
    filters: { status?: string },
    pagination: PaginationDto,
  ): Promise<PaginatedResult<object>> {
    const where: Prisma.SubscriptionWhereInput = { tenantId };
    if (filters.status) where.status = filters.status as any;

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

  async getSubscription(tenantId: string, id: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { id, tenantId },
      include: {
        endUser: { select: { id: true, telegramId: true, username: true, firstName: true } },
        product: { select: { id: true, name: true, price: true, billingInterval: true } },
        access: { select: { id: true, status: true, revokedAt: true } },
        payments: { orderBy: { createdAt: 'desc' }, take: 12 },
      },
    });
    if (!sub) throw new NotFoundException('Assinatura não encontrada');
    return sub;
  }

  // ── Carteira ───────────────────────────────────────────────────────────────

  async getWallet(tenantId: string) {
    const wallet = await this.walletService.getOrCreateWallet(tenantId);
    return {
      balance: Number(wallet.balance),
      totalReceived: Number(wallet.totalReceived),
      totalFees: Number(wallet.totalFees),
      totalWithdrawn: Number(wallet.totalWithdrawn),
    };
  }

  async getWalletTransactions(tenantId: string, pagination: PaginationDto) {
    const wallet = await this.walletService.getOrCreateWallet(tenantId);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
    ]);
    return paginate(data, total, pagination.page, pagination.take);
  }

  // ── Saques ─────────────────────────────────────────────────────────────────

  async requestWithdrawal(
    tenantId: string,
    amount: number,
  ) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });

    if (!tenant.pixKeyType || !tenant.pixKeyValue) {
      throw new BadRequestException(
        'Configure sua chave Pix no perfil antes de solicitar um saque',
      );
    }

    const platformConfig = await this.prisma.platformConfig.findFirst();
    const minAmount = Number(platformConfig?.minWithdrawalAmount ?? 50);

    if (amount < minAmount) {
      throw new BadRequestException(`Valor mínimo para saque é R$ ${minAmount.toFixed(2)}`);
    }

    const balance = await this.walletService.getBalance(tenantId);
    if (balance.lessThan(amount)) {
      throw new BadRequestException('Saldo insuficiente');
    }

    // Cria a solicitação de saque e debita o saldo atomicamente
    return this.walletService.requestWithdrawal(
      tenantId,
      new Decimal(amount),
      tenant.pixKeyType,
      tenant.pixKeyValue,
    );
  }

  async getWithdrawals(tenantId: string, pagination: PaginationDto): Promise<PaginatedResult<object>> {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.withdrawalRequest.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.withdrawalRequest.count({ where: { tenantId } }),
    ]);
    return paginate(data, total, pagination.page, pagination.take);
  }
}
