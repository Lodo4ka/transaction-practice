import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('test/cache')
  getHelloWithCache(): Promise<string> {
    return this.appService.getHelloWithCache();
  }
}
