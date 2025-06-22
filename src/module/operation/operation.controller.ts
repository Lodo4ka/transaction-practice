import { Body, Controller, Post } from '@nestjs/common';
import { OperationService } from './operation.service';
import { CreateOperationDto } from './dto/create-operation';

@Controller('transactions')
export class OperationController {
  constructor(private readonly operationService: OperationService) {}

  @Post()
  async createOperation(@Body() data: CreateOperationDto) {
    return this.operationService.createOperation(data);
  }
}
