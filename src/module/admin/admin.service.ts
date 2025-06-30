import { Injectable } from '@nestjs/common';
import { OperationRepository } from '../operation/operation.repository';

@Injectable()
export class AdminService {
  constructor(private readonly operationRepository: OperationRepository) {}

  async getAllTransactions() {
    return this.operationRepository.getAllTransactions();
  }
}
