import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto, UpdateAccountDto } from './dto';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateAccountDto) {
    return this.prisma.account.create({ data: dto });
  }

  findAll() {
    return this.prisma.account.findMany({
      orderBy: { name: 'asc' },
      include: { properties: true, contacts: true },
    });
  }

  async findOne(id: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
      include: {
        properties: true,
        contacts: true,
        jobs: { orderBy: { createdAt: 'desc' }, include: { photos: true } },
        invoices: { orderBy: { issueDate: 'desc' } },
      },
    });
    if (!account) throw new NotFoundException('Account not found');
    return account;
  }

  async update(id: string, dto: UpdateAccountDto) {
    await this.findOne(id);
    return this.prisma.account.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.account.delete({ where: { id } });
    return { ok: true };
  }
}
