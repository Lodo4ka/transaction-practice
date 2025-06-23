import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { Cache } from 'cache-manager';

@Injectable()
export class AppService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getHelloWithCache(): Promise<string> {
    const cachedData = await this.cacheManager.get<string>('my-key');
    if (cachedData) {
      return cachedData;
    }

    const data = await new Promise<string>((resolve) =>
      setTimeout(() => resolve('Hello from Cache!'), 2000),
    );
    await this.cacheManager.set('my-key', data);
    return data;
  }
}
