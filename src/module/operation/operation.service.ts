import { Injectable } from '@nestjs/common';
import { OperationRepository } from './operation.repository';
import { CreateOperationDto } from './dto/create-operation';
import { Operation } from '@prisma/client';

@Injectable()
export class OperationService {
  constructor(private readonly operationRepository: OperationRepository) {}

  async createOperation(data: CreateOperationDto): Promise<Operation> {
    const operation = await this.operationRepository.createOperation(data);

    return operation;
  }
}
