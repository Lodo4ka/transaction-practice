import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { UserService } from './user.service';
import { CacheInterceptor } from '@nestjs/cache-manager';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id/balance')
  @UseInterceptors(CacheInterceptor)
  async getBalance(@Param('id') id: string) {
    const balance = await this.userService.getBalance(id);
    return { balance };
  }
}
