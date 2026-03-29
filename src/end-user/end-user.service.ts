import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EndUserService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(data: {
    tenantId: string;
    telegramId: bigint;
    username?: string;
    firstName?: string;
    lastName?: string;
  }) {
    return this.prisma.endUser.upsert({
      where: { tenantId_telegramId: { tenantId: data.tenantId, telegramId: data.telegramId } },
      create: data,
      update: {
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
      },
    });
  }

  findByTelegram(tenantId: string, telegramId: bigint) {
    return this.prisma.endUser.findUnique({
      where: { tenantId_telegramId: { tenantId, telegramId } },
    });
  }

  findById(id: string) {
    return this.prisma.endUser.findUnique({ where: { id } });
  }
}
