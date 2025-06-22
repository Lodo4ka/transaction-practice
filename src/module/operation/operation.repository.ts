import { Injectable } from '@nestjs/common';
import { Operation } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import { CreateOperationDto } from './dto/create-operation';

@Injectable()
export class OperationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createOperation(data: CreateOperationDto): Promise<Operation> {
    const newOperation = await this.prisma.operation.create({
      data,
    });

    return newOperation;
  }
}
