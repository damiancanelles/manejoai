import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { searchTerms } from '../common/search';
import { CreateAccountDto, UpdateAccountDto } from './dto';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateAccountDto, businessId: string) {
    return this.prisma.account.create({ data: { ...dto, businessId } });
  }

  findAll(businessId: string, search?: string) {
    const terms = search ? searchTerms(search) : [];
    return this.prisma.account.findMany({
      where: {
        businessId,
        ...(terms.length
          ? {
              AND: terms.map((term) => ({
                OR: [
                  { name: { contains: term, mode: 'insensitive' as const } },
                  { properties: { some: { name: { contains: term, mode: 'insensitive' as const } } } },
                ],
              })),
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      include: { properties: true, contacts: { include: { property: true } } },
    });
  }

  /** Loads the account and confirms it belongs to businessId - the one place every other method's ownership check goes through. */
  async findOne(id: string, businessId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
      include: {
        properties: true,
        contacts: { include: { property: true } },
        jobs: { orderBy: { createdAt: 'desc' }, include: { photos: true } },
        quotes: { orderBy: { issueDate: 'desc' } },
        invoices: { orderBy: { issueDate: 'desc' } },
        payments: { orderBy: { paidAt: 'desc' }, include: { invoices: true } },
      },
    });
    // Same "not found" whether the id doesn't exist or belongs to another
    // business - never reveal that someone else's account id is real.
    if (!account || account.businessId !== businessId) throw new NotFoundException('Account not found');
    return account;
  }

  async update(id: string, dto: UpdateAccountDto, businessId: string) {
    await this.findOne(id, businessId);
    return this.prisma.account.update({ where: { id }, data: dto });
  }

  async remove(id: string, businessId: string) {
    await this.findOne(id, businessId);
    await this.prisma.account.delete({ where: { id } });
    return { ok: true };
  }
}
