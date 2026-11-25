import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { StaffRole } from '@prisma/client';

import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { slugify } from '../common/slugify';
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
    emailSlug: string;
    replyToEmail: string | null;
    subscriptionStatus: string;
    subscriptionTier: string;
    trialEndsAt: Date | null;
    currentPeriodEnd: Date | null;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private mail: MailService,
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

    // Deactivated crew members (see UsersService.deactivateCrewUser) can no
    // longer sign in - checked after the password so a wrong password still
    // reads as "invalid credentials", not a hint the account exists.
    if (!user.active) throw new UnauthorizedException('This account has been deactivated');

    return this.issueSession(user);
  }

  /**
   * "n2sky" -> "n2sky", or "n2sky2", "n2sky3", ... if already taken - the
   * local part of this business's own <slug>@manejoai.cloud sending
   * address (see MailService), so it never collides with another tenant's.
   */
  private async generateUniqueEmailSlug(businessName: string): Promise<string> {
    const base = slugify(businessName);
    let candidate = base;
    let suffix = 1;
    // Collisions should be rare (two businesses whose names strip to the
    // same slug) - this loop just keeps trying until one's free.
    while (await this.prisma.business.findUnique({ where: { emailSlug: candidate } })) {
      suffix++;
      candidate = `${base}${suffix}`;
    }
    return candidate;
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
    const emailSlug = await this.generateUniqueEmailSlug(dto.businessName);
    const trialDays = Number(this.config.get('TRIAL_PERIOD_DAYS', 14));
    const trialEndsAt = new Date(Date.now() + trialDays * 86_400_000);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        role: StaffRole.ADMIN,
        termsAcceptedAt: new Date(),
        business: {
          create: {
            name: dto.businessName,
            addressLine1: dto.addressLine1,
            addressLine2: dto.addressLine2,
            phone: dto.phone,
            emailSlug,
            // A real inbox to start from - editable afterward in Settings.
            replyToEmail: dto.email,
            // subscriptionStatus stays at its schema default ('trialing') -
            // this is what starts the clock on it (see SubscriptionGuard).
            trialEndsAt,
          },
        },
      },
      include: { business: true },
    });

    return this.issueSession(user);
  }

  // ---------- Forgot / reset password ----------

  private static readonly RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
  // A second request for the same account inside this window sends nothing,
  // so the form can't be used to flood someone's inbox.
  private static readonly RESET_REQUEST_COOLDOWN_MS = 60 * 1000;

  private hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Emails a single-use link to /reset-password?token=... if the email
   * belongs to an active account. Silently does nothing otherwise - the
   * controller answers the same either way.
   */
  async requestPasswordReset(email: string, lang: 'en' | 'es'): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.active) return;

    const recent = await this.prisma.passwordResetToken.findFirst({
      where: { userId: user.id, createdAt: { gt: new Date(Date.now() - AuthService.RESET_REQUEST_COOLDOWN_MS) } },
    });
    if (recent) return;

    const token = randomBytes(32).toString('hex');
    const now = new Date();
    await this.prisma.$transaction([
      // Only the newest link should work - retire any earlier unused ones
      // (marked used, not deleted).
      this.prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: now },
      }),
      this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: this.hashResetToken(token),
          expiresAt: new Date(now.getTime() + AuthService.RESET_TOKEN_TTL_MS),
        },
      }),
    ]);

    const frontendUrl = (this.config.get<string>('FRONTEND_URL') || 'http://localhost:5173').replace(/\/$/, '');
    const link = `${frontendUrl}/reset-password?token=${token}`;
    const es = lang === 'es';
    const subject = es ? 'Restablece tu contraseña de manejoai' : 'Reset your manejoai password';
    const html = es
      ? `<p>Hola ${escapeHtml(user.name)},</p>
<p>Recibimos una solicitud para restablecer la contraseña de tu cuenta de manejoai.</p>
<p><a href="${link}">Elige una nueva contraseña</a></p>
<p>El enlace funciona una sola vez y vence en 1 hora. Si no lo pediste tú, ignora este correo; tu contraseña no cambia.</p>`
      : `<p>Hi ${escapeHtml(user.name)},</p>
<p>We got a request to reset the password for your manejoai account.</p>
<p><a href="${link}">Choose a new password</a></p>
<p>The link works once and expires in 1 hour. If you didn't ask for this, ignore this email; your password stays the same.</p>`;

    // System email (no business) - goes out from MAIL_FROM.
    await this.mail.send({ to: user.email, subject, html });
  }

  async resetPassword(token: string, newPassword: string): Promise<{ ok: true }> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.hashResetToken(token) },
      include: { user: true },
    });
    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now() || !record.user.active) {
      throw new BadRequestException('This reset link is invalid or has expired. Request a new one.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      // Claim the token first, so a double-submitted form can't use it twice.
      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: now },
      });
      if (claimed.count === 0) {
        throw new BadRequestException('This reset link is invalid or has expired. Request a new one.');
      }
      await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
      // Retire any other outstanding links for this account.
      await tx.passwordResetToken.updateMany({
        where: { userId: record.userId, usedAt: null },
        data: { usedAt: now },
      });
    });
    return { ok: true };
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
