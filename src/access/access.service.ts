import { Injectable } from '@nestjs/common';
import { Access, AccessStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveByUserId(userId: string): Promise<(Access & { product: { name: string } })[]> {
    return this.prisma.access.findMany({
      where: { userId, status: AccessStatus.ACTIVE },
      include: { product: { select: { name: true } } },
      orderBy: { grantedAt: 'desc' },
    });
  }
}
