import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  findAllActive(tenantId: string) {
    return this.prisma.product.findMany({
      where: { tenantId, active: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.product.findFirst({ where: { id, tenantId } });
  }

  create(tenantId: string, data: {
    name: string;
    description?: string;
    type: 'ONE_TIME' | 'RECURRING';
    price: number;
    currency?: string;
    billingInterval?: 'MONTHLY' | 'YEARLY';
    trialDays?: number;
    chatId?: string;
  }) {
    return this.prisma.product.create({ data: { tenantId, ...data } });
  }

  update(tenantId: string, id: string, data: Partial<{
    name: string;
    description: string;
    price: number;
    chatId: string;
    active: boolean;
  }>) {
    return this.prisma.product.updateMany({ where: { id, tenantId }, data });
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.product.updateMany({ where: { id, tenantId }, data: { active: false } });
  }
}
