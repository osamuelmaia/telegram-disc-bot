import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto, PAGINATION_DEFAULT_LIMIT } from '../common/dto/pagination.dto';
import { paginate, PaginatedResult } from '../common/dto/paginated-result.type';

interface UpsertUserInput {
  telegramId: bigint;
  firstName?: string;
  lastName?: string;
  username?: string;
}

export interface FindUsersFilter {
  /** Busca parcial em username, firstName, lastName */
  search?: string;
  /** Filtra por telegramId exato */
  telegramId?: bigint;
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

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findAll(
    filter: FindUsersFilter = {},
    pagination: PaginationDto = new PaginationDto(),
  ): Promise<PaginatedResult<User>> {
    const where: Prisma.UserWhereInput = {};

    if (filter.telegramId) {
      where.telegramId = filter.telegramId;
    } else if (filter.search) {
      const term = filter.search.trim();
      where.OR = [
        { username: { contains: term, mode: 'insensitive' } },
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(data, total, pagination.page, pagination.take);
  }
}
