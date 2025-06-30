import { Injectable } from '@nestjs/common';
import { Operation, Prisma } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import { SearchHistoryDto } from './dto/search-history';

@Injectable()
export class OperationRepository {
  constructor(private readonly prisma: PrismaService) {}

  getAllTransactions(): Promise<Operation[]> {
    return this.prisma.operation.findMany();
  }

  async getFilteredOperations(
    searchHistory: SearchHistoryDto,
  ): Promise<Operation[]> {
    const { date, userId } = searchHistory;
    const where: Prisma.OperationWhereInput = {};
    if (date) {
      where.createdAt = date;
    }
    if (userId) {
      where.OR = [{ senderId: userId }, { receiverId: userId }];
    }
    return this.prisma.operation.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      where,
    });
  }
}
