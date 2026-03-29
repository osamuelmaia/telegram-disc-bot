import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { name: string; email: string; password: string }) {
    const existing = await this.prisma.tenant.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictException('Email já cadastrado');
    return this.prisma.tenant.create({ data });
  }

  findById(id: string) {
    return this.prisma.tenant.findUnique({ where: { id } });
  }

  findByEmail(email: string) {
    return this.prisma.tenant.findUnique({ where: { email } });
  }

  async findAll(params: { page?: number; limit?: number; status?: string } = {}) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = params.status ? { status: params.status as any } : {};
    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, email: true, status: true, createdAt: true, platformFeePercent: true } }),
      this.prisma.tenant.count({ where }),
    ]);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  update(id: string, data: Partial<{ name: string; pixKeyType: string; pixKeyValue: string; platformFeePercent: number }>) {
    return this.prisma.tenant.update({ where: { id }, data });
  }

  updateStatus(id: string, status: 'ACTIVE' | 'SUSPENDED' | 'PENDING') {
    return this.prisma.tenant.update({ where: { id }, data: { status } });
  }

  async findOrFail(id: string) {
    const tenant = await this.findById(id);
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    return tenant;
  }
}
