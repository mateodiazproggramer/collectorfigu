import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException('El correo ya esta registrado');

    const customerRole = await this.prisma.role.upsert({ where: { name: RoleName.CUSTOMER }, update: {}, create: { name: RoleName.CUSTOMER } });
    const passwordHash = await bcrypt.hash(dto.password, Number(process.env.BCRYPT_SALT_ROUNDS ?? 12));
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phone: dto.phone?.trim(),
        document: dto.document?.trim(),
        roles: { create: [{ roleId: customerRole.id }] },
        customer: { create: { document: dto.document?.trim() } },
        cart: { create: {} },
      },
      include: { roles: { include: { role: true } } },
    });
    return this.sign(user.id, user.email, user.roles.map((r) => r.role.name));
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase().trim() }, include: { roles: { include: { role: true } } } });
    if (!user?.passwordHash || !user.isActive) throw new UnauthorizedException('Credenciales invalidas');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciales invalidas');
    return this.sign(user.id, user.email, user.roles.map((r) => r.role.name));
  }

  private sign(sub: string, email: string, roles: RoleName[]) {
    return { accessToken: this.jwt.sign({ sub, email, roles }), user: { id: sub, email, roles } };
  }
}
