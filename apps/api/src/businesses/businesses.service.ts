import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateBusinessDto } from './dto';

@Injectable()
export class BusinessesService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: string) {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundException('Business not found');
    return business;
  }

  async update(id: string, dto: UpdateBusinessDto) {
    await this.findOne(id);
    return this.prisma.business.update({ where: { id }, data: dto });
  }
}
