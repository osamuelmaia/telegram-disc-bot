import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { TenantService } from '../tenant/tenant.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly tenantService: TenantService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const tenant = await this.tenantService.findByEmail(email);
    if (!tenant) throw new UnauthorizedException('Credenciais inválidas');

    const valid = await bcrypt.compare(password, tenant.password);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    if (tenant.status === 'SUSPENDED') {
      throw new UnauthorizedException('Conta suspensa. Entre em contato com o suporte.');
    }

    const payload = { sub: tenant.id, email: tenant.email };
    return { access_token: this.jwtService.sign(payload), tenant: { id: tenant.id, name: tenant.name, email: tenant.email, status: tenant.status } };
  }

  async register(name: string, email: string, password: string) {
    const hash = await bcrypt.hash(password, 12);
    return this.tenantService.create({ name, email, password: hash });
  }
}
