import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email }, include: { business: true } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
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
