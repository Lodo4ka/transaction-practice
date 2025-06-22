import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { OperationRepository } from '../operation/operation.repository';
import { ConfigService } from '@nestjs/config';

@Module({
  controllers: [AdminController],
  providers: [AdminService, OperationRepository, ConfigService],
})
export class AdminModule {}
