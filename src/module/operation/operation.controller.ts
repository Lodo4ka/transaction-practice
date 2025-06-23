import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { OperationService } from './operation.service';
import { CreateOperationDto } from './dto/create-operation';
import { SearchHistoryDto } from './dto/search-history';
import { CacheInterceptor } from '@nestjs/cache-manager';

@Controller('transactions')
export class OperationController {
  constructor(private readonly operationService: OperationService) {}

  @Get()
  @UseInterceptors(CacheInterceptor)
  async getOperations(@Query() searchHistory: SearchHistoryDto) {
    return this.operationService.getFilteredOperations(searchHistory);
  }

  @Post()
  async createOperation(@Body() data: CreateOperationDto) {
    return this.operationService.createOperation(data);
  }
}
