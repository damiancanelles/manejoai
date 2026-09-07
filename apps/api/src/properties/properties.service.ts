import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePropertyDto, UpdatePropertyDto } from './dto';

@Injectable()
export class PropertiesService {
  constructor(private prisma: PrismaService) {}

  /** Confirms accountId is one of this business's accounts before letting anything reference it. */
  private async assertOwnsAccount(accountId: string, businessId: string) {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account || account.businessId !== businessId) throw new NotFoundException('Account not found');
  }

  async create(dto: CreatePropertyDto, businessId: string) {
    await this.assertOwnsAccount(dto.accountId, businessId);
    return this.prisma.property.create({ data: dto });
  }

  async findForAccount(accountId: string, businessId: string) {
    await this.assertOwnsAccount(accountId, businessId);
    return this.prisma.property.findMany({ where: { accountId }, orderBy: { name: 'asc' } });
  }

  async findOne(id: string, businessId: string) {
    const property = await this.prisma.property.findUnique({ where: { id }, include: { account: true } });
    if (!property || property.account.businessId !== businessId) throw new NotFoundException('Property not found');
    return property;
  }

  async update(id: string, dto: UpdatePropertyDto, businessId: string) {
    await this.findOne(id, businessId);
    return this.prisma.property.update({ where: { id }, data: dto });
  }

  async remove(id: string, businessId: string) {
    await this.findOne(id, businessId);
    await this.prisma.property.delete({ where: { id } });
    return { ok: true };
  }
}
