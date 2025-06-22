import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreateOperationDto } from './dto/create-operation';
import { Operation, OperationStatus } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CacheManagerStore } from 'cache-manager';
import { SearchHistoryDto } from './dto/search-history';
import { OperationRepository } from './operation.repository';

@Injectable()
export class OperationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly operationRepository: OperationRepository,
    @Inject(CACHE_MANAGER) private cacheManager: CacheManagerStore,
  ) {}

  async getFilteredOperations(
    searchHistory: SearchHistoryDto,
  ): Promise<Operation[]> {
    return this.operationRepository.getFilteredOperations(searchHistory);
  }

  async createOperation(data: CreateOperationDto): Promise<Operation> {
    const { amount, senderId, receiverId } = data;

    return this.prisma.$transaction(async (tx) => {
      const userSender = await tx.user.findUniqueOrThrow({
        where: { id: senderId },
      });
      const receiver = await tx.user.findUniqueOrThrow({
        where: { id: receiverId },
      });
      if (userSender.balance.lessThan(amount)) {
        throw new BadRequestException('Insufficient balance');
      }

      const updatedUserSender = await tx.user.update({
        where: { id: userSender.id, version: userSender.version },
        data: {
          balance: {
            decrement: amount,
          },
          version: {
            increment: 1,
          },
        },
      });
      if (!updatedUserSender) {
        throw new BadRequestException('Optimistic lock conflict');
      }
      await tx.user.update({
        where: { id: receiverId, version: receiver.version },
        data: {
          balance: {
            increment: amount,
          },
        },
      });
      const operation = await tx.operation.create({
        data: {
          amount,
          senderId,
          receiverId,
          status: OperationStatus.SUCCESS,
        },
      });
      await this.cacheManager.del(`/user/${senderId}/balance`);
      await this.cacheManager.del(`/user/${receiverId}/balance`);
      await this.cacheManager.del(`/admin/transactions`);
      return operation;
    });
  }
}
