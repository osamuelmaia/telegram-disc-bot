import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Access, AccessStatus, Prisma } from '@prisma/client';
import { PaginatedResult, paginate } from '../common/dto/paginated-result.type';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ACCESS_EVENTS, AccessManuallyRevokedEvent } from '../payment/payment.events';
import { PrismaService } from '../prisma/prisma.service';

export interface FindAccessesFilter {
  userId?: string;
  productId?: string;
  status?: AccessStatus;
}

export interface GrantManualAccessDto {
  userId: string;
  productId: string;
  chatId: string;
  expiresAt?: Date;
}

@Injectable()
export class AccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findActiveByUserId(userId: string): Promise<(Access & { product: { name: string } })[]> {
    return this.prisma.access.findMany({
      where: { userId, status: AccessStatus.ACTIVE },
      include: { product: { select: { name: true } } },
      orderBy: { grantedAt: 'desc' },
    });
  }

  async findAll(
    filter: FindAccessesFilter = {},
    pagination: PaginationDto = new PaginationDto(),
  ): Promise<PaginatedResult<Access>> {
    const where: Prisma.AccessWhereInput = {};
    if (filter.userId) where.userId = filter.userId;
    if (filter.productId) where.productId = filter.productId;
    if (filter.status) where.status = filter.status;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.access.findMany({
        where,
        orderBy: { grantedAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
        include: {
          user: { select: { telegramId: true, username: true, firstName: true } },
          product: { select: { name: true } },
        },
      }),
      this.prisma.access.count({ where }),
    ]);

    return paginate(data, total, pagination.page, pagination.take);
  }

  async grantManual(dto: GrantManualAccessDto): Promise<Access> {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException(`User ${dto.userId} not found`);

    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException(`Product ${dto.productId} not found`);

    const existing = await this.prisma.access.findFirst({
      where: { userId: dto.userId, productId: dto.productId, status: AccessStatus.ACTIVE },
    });
    if (existing) throw new ConflictException('User already has active access to this product');

    return this.prisma.access.create({
      data: {
        userId: dto.userId,
        productId: dto.productId,
        chatId: dto.chatId,
        status: AccessStatus.ACTIVE,
        expiresAt: dto.expiresAt,
      },
    });
  }

  async revoke(accessId: string, reason: string): Promise<Access> {
    const access = await this.prisma.access.findUnique({
      where: { id: accessId },
      include: { user: true, product: true },
    });
    if (!access) throw new NotFoundException(`Access ${accessId} not found`);
    if (access.status === AccessStatus.REVOKED) {
      throw new ConflictException(`Access ${accessId} is already revoked`);
    }

    const revoked = await this.prisma.access.update({
      where: { id: accessId },
      data: {
        status: AccessStatus.REVOKED,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });

    const event: AccessManuallyRevokedEvent = {
      accessId: access.id,
      userId: access.userId,
      telegramId: access.user.telegramId,
      productId: access.productId,
      productName: access.product.name,
      chatId: access.chatId,
      reason,
    };
    this.eventEmitter.emit(ACCESS_EVENTS.MANUALLY_REVOKED, event);

    return revoked;
  }
}
