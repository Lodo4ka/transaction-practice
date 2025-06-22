import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ConfigService } from '@nestjs/config';
import { CacheInterceptor } from '@nestjs/cache-manager';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly configService: ConfigService,
  ) {}

  @Get('/transactions')
  @UseInterceptors(CacheInterceptor)
  async getTransactions() {
    return this.adminService.getAllTransactions();
  }

  @Get('/strategy')
  getStrategy() {
    return this.configService.get<string>('TRANSACTION_STRATEGY');
  }
}
