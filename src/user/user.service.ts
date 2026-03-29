import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface UpsertUserInput {
  telegramId: bigint;
  firstName?: string;
  lastName?: string;
  username?: string;
}

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(input: UpsertUserInput): Promise<User> {
    return this.prisma.user.upsert({
      where: { telegramId: input.telegramId },
      create: {
        telegramId: input.telegramId,
        firstName: input.firstName,
        lastName: input.lastName,
        username: input.username,
      },
      update: {
        firstName: input.firstName,
        lastName: input.lastName,
        username: input.username,
      },
    });
  }

  async findByTelegramId(telegramId: bigint): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { telegramId } });
  }
}
