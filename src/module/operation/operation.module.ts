import { Module } from '@nestjs/common';
import { OperationController } from './operation.controller';
import { OperationService } from './operation.service';
import { OperationRepository } from './operation.repository';
import { TransactionStrategyService } from './transaction-strategy.service';

@Module({
  controllers: [OperationController],
  providers: [
    OperationService,
    OperationRepository,
    TransactionStrategyService,
  ],
})
export class OperationModule {}
