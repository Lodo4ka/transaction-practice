import { Controller, Get } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ConfigService } from '@nestjs/config';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly configService: ConfigService,
  ) {}

  @Get('/transactions')
  async getTransactions() {
    return this.adminService.getAllTransactions();
  }

  @Get('/strategy')
  getStrategy() {
    return this.configService.get<string>('TRANSACTION_STRATEGY');
  }
}
