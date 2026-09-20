import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { StaffRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCrewUserDto } from './dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email }, include: { business: true } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async createCrewUser(businessId: string, dto: CreateCrewUserDto) {
    const existing = await this.findByEmail(dto.email);
    if (existing) throw new BadRequestException('An account with this email already exists.');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { businessId, email: dto.email, name: dto.name, passwordHash, role: StaffRole.CREW },
    });
    return { id: user.id, name: user.name, email: user.email, active: user.active, createdAt: user.createdAt };
  }

  listCrew(businessId: string) {
    return this.prisma.user.findMany({
      where: { businessId, role: StaffRole.CREW },
      select: { id: true, name: true, email: true, active: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deactivateCrewUser(id: string, businessId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.businessId !== businessId || user.role !== StaffRole.CREW) {
      throw new NotFoundException('Crew member not found');
    }
    await this.prisma.user.update({ where: { id }, data: { active: false } });
    return { ok: true };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const currentOk = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!currentOk) throw new UnauthorizedException('Current password is incorrect');

    if (newPassword === currentPassword) {
      throw new BadRequestException('New password must be different from the current password');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { ok: true };
  }

  // Registration only for now - nothing sends a push notification yet.
  // One token per user; logging into the mobile app on a second device
  // just overwrites it.
  async registerPushToken(userId: string, token: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { expoPushToken: token } });
    return { ok: true };
  }
}
