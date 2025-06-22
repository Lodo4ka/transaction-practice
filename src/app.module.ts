import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from 'nestjs-prisma';
import { createKeyv } from '@keyv/redis';
import { UserModule } from './module/user/user.module';
import { AdminModule } from './module/admin/admin.module';
import { TransactionModule } from './module/transaction/transaction.module';
import { OperationModule } from './module/operation/operation.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule.forRootAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        prismaOptions: {
          datasources: {
            db: {
              url: configService.get('DATABASE_URL'),
            },
          },
        },
      }),
      inject: [ConfigService],
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST');
        const port = configService.get<number>('REDIS_PORT');
        const url = `redis://${host}:${port}`;

        return {
          stores: [
            createKeyv({
              url,
            }),
          ],
        };
      },
      inject: [ConfigService],
    }),
    UserModule,
    TransactionModule,
    AdminModule,
    OperationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
