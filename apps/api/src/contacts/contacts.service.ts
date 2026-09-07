import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto, UpdateContactDto } from './dto';

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService) {}

  /** Confirms accountId is one of this business's accounts before letting anything reference it. */
  private async assertOwnsAccount(accountId: string, businessId: string) {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account || account.businessId !== businessId) throw new NotFoundException('Account not found');
  }

  private async assertPropertyBelongsToAccount(propertyId: string, accountId: string) {
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property || property.accountId !== accountId) {
      throw new BadRequestException('That property does not belong to this contact\'s account.');
    }
  }

  async create(dto: CreateContactDto, businessId: string) {
    await this.assertOwnsAccount(dto.accountId, businessId);
    if (dto.propertyId) {
      await this.assertPropertyBelongsToAccount(dto.propertyId, dto.accountId);
    }
    return this.prisma.contact.create({ data: dto });
  }

  async findForAccount(accountId: string, businessId: string) {
    await this.assertOwnsAccount(accountId, businessId);
    return this.prisma.contact.findMany({
      where: { accountId },
      orderBy: { role: 'asc' },
      include: { property: true },
    });
  }

  async findOne(id: string, businessId: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
      include: { property: true, account: true },
    });
    if (!contact || contact.account.businessId !== businessId) throw new NotFoundException('Contact not found');
    return contact;
  }

  async update(id: string, dto: UpdateContactDto, businessId: string) {
    const existing = await this.findOne(id, businessId);
    if (dto.propertyId) {
      await this.assertPropertyBelongsToAccount(dto.propertyId, existing.accountId);
    }
    return this.prisma.contact.update({ where: { id }, data: dto });
  }

  async remove(id: string, businessId: string) {
    await this.findOne(id, businessId);
    await this.prisma.contact.delete({ where: { id } });
    return { ok: true };
  }
}
