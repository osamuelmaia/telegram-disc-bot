import { Injectable, NotFoundException } from '@nestjs/common';
import { BillingInterval, Prisma, Product, ProductType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateProductDto {
  name: string;
  description?: string;
  type: ProductType;
  price: number;
  currency?: string;
  billingInterval?: BillingInterval;
  trialDays?: number;
  chatId?: string;
  active?: boolean;
  metadata?: Record<string, unknown>;
}

export type UpdateProductDto = Partial<CreateProductDto>;

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllActive(): Promise<Product[]> {
    return this.prisma.product.findMany({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string): Promise<Product | null> {
    return this.prisma.product.findUnique({ where: { id } });
  }

  async create(dto: CreateProductDto): Promise<Product> {
    return this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type,
        price: dto.price,
        currency: dto.currency ?? 'BRL',
        billingInterval: dto.billingInterval,
        trialDays: dto.trialDays,
        chatId: dto.chatId,
        active: dto.active ?? true,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Product ${id} not found`);

    return this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.billingInterval !== undefined && { billingInterval: dto.billingInterval }),
        ...(dto.trialDays !== undefined && { trialDays: dto.trialDays }),
        ...(dto.chatId !== undefined && { chatId: dto.chatId }),
        ...(dto.active !== undefined && { active: dto.active }),
        ...(dto.metadata !== undefined && { metadata: dto.metadata as Prisma.InputJsonValue }),
      },
    });
  }

  async softDelete(id: string): Promise<Product> {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Product ${id} not found`);

    return this.prisma.product.update({
      where: { id },
      data: { active: false },
    });
  }
}
