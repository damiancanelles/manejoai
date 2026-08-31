import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto, UpdateContactDto } from './dto';

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService) {}

  private async assertPropertyBelongsToAccount(propertyId: string, accountId: string) {
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property || property.accountId !== accountId) {
      throw new BadRequestException('That property does not belong to this contact\'s account.');
    }
  }

  async create(dto: CreateContactDto) {
    if (dto.propertyId) {
      await this.assertPropertyBelongsToAccount(dto.propertyId, dto.accountId);
    }
    return this.prisma.contact.create({ data: dto });
  }

  findForAccount(accountId: string) {
    return this.prisma.contact.findMany({
      where: { accountId },
      orderBy: { role: 'asc' },
      include: { property: true },
    });
  }

  async findOne(id: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id }, include: { property: true } });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async update(id: string, dto: UpdateContactDto) {
    const existing = await this.findOne(id);
    if (dto.propertyId) {
      await this.assertPropertyBelongsToAccount(dto.propertyId, existing.accountId);
    }
    return this.prisma.contact.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.contact.delete({ where: { id } });
    return { ok: true };
  }
}
