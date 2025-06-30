import { Injectable } from '@nestjs/common';
import { CreateOperationDto } from './dto/create-operation';
import { Operation } from '@prisma/client';
import { SearchHistoryDto } from './dto/search-history';
import { OperationRepository } from './operation.repository';
import { TransactionStrategyService } from './transaction-strategy.service';

@Injectable()
export class OperationService {
  constructor(
    private readonly operationRepository: OperationRepository,
    private readonly transactionStrategyService: TransactionStrategyService,
  ) {}

  async getFilteredOperations(
    searchHistory: SearchHistoryDto,
  ): Promise<Operation[]> {
    return this.operationRepository.getFilteredOperations(searchHistory);
  }

  async createOperation(data: CreateOperationDto): Promise<Operation> {
    const { amount, senderId, receiverId } = data;
    return this.transactionStrategyService.runTransaction({
      amount,
      senderId,
      receiverId,
    });
  }
}
