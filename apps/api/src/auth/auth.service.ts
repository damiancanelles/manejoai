import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { StaffRole } from '@prisma/client';

import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto';

interface AuthUser {
  id: string;
  businessId: string;
  email: string;
  role: StaffRole;
  business: {
    id: string;
    name: string;
    addressLine1: string;
    addressLine2: string | null;
    phone: string | null;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /** Shared by login and register - same token/response shape either way. */
  private async issueSession(user: AuthUser & { name: string }) {
    const payload = { sub: user.id, email: user.email, role: user.role, businessId: user.businessId };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      business: user.business,
    };
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid email or password');

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) throw new UnauthorizedException('Invalid email or password');

    return this.issueSession(user);
  }

  /**
   * Self-service signup: creates a brand-new Business (its name/address/
   * phone show on this business's invoices/emails from here on, replacing
   * the old hardcoded COMPANY config) plus its first user as ADMIN.
   * Auto-logs in on success, same response shape as login().
   */
  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException('An account with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        role: StaffRole.ADMIN,
        business: {
          create: {
            name: dto.businessName,
            addressLine1: dto.addressLine1,
            addressLine2: dto.addressLine2,
            phone: dto.phone,
          },
        },
      },
      include: { business: true },
    });

    return this.issueSession(user);
  }
}
