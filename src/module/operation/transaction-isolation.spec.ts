import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PrismaService } from 'nestjs-prisma';
import { TransactionStrategyService } from './transaction-strategy.service';
import { TransactionStrategy } from './operation.types';
import { User } from '@prisma/client';

describe('Transaction Isolation Test', () => {
  let service: TransactionStrategyService;
  let prismaService: PrismaService;
  let user1: User;
  let user2: User;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [
        TransactionStrategyService,
        PrismaService,
        {
          provide: CACHE_MANAGER,
          useValue: {
            mdel: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<TransactionStrategyService>(
      TransactionStrategyService,
    );
    prismaService = module.get<PrismaService>(PrismaService);

    // Создаем тестовых пользователей
    user1 = await prismaService.user.create({
      data: { name: 'test1', balance: 1000, version: 1 },
    });
    user2 = await prismaService.user.create({
      data: { name: 'test2', balance: 500, version: 1 },
    });
  });

  afterAll(async () => {
    await prismaService.operation.deleteMany();
    await prismaService.user.deleteMany();
    await prismaService.$disconnect();
  });

  afterEach(async () => {
    await prismaService.operation.deleteMany();
  });

  it('should test transaction isolation with concurrent transfers', async () => {
    process.env.TRANSACTION_STRATEGY = TransactionStrategy.PESSIMISTIC;

    // Запускаем 50 параллельных транзакций
    const transactions = Array.from({ length: 50 }, () =>
      service.runTransaction({
        amount: 10,
        senderId: user1.id,
        receiverId: user2.id,
      }),
    );

    const results = await Promise.allSettled(transactions);

    const successful = results.filter((r) => r.status === 'fulfilled').length;

    // Проверяем финальные балансы
    const finalUser1 = await prismaService.user.findUnique({
      where: { id: user1.id },
    });
    const finalUser2 = await prismaService.user.findUnique({
      where: { id: user2.id },
    });

    expect(successful).toBeGreaterThan(0);
    expect(finalUser1?.balance.toNumber()).toBeLessThanOrEqual(1000);
    expect(finalUser2?.balance.toNumber()).toBeGreaterThanOrEqual(500);
  }, 30000);
});
