import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PrismaService } from 'nestjs-prisma';
import { TransactionStrategyService } from './transaction-strategy.service';
import { TransactionStrategy } from './operation.types';
import { User } from '@prisma/client';

describe('TransactionStrategyService Integration Tests', () => {
  let service: TransactionStrategyService;
  let prismaService: PrismaService;
  let testUsers: User[];

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
        }),
      ],
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

    // Очищаем базу данных перед тестами
    await prismaService.operation.deleteMany();
    await prismaService.user.deleteMany();

    // Создаем тестовых пользователей
    testUsers = await Promise.all([
      prismaService.user.create({
        data: {
          name: 'user1',
          balance: 10000,
          version: 1,
        },
      }),
      prismaService.user.create({
        data: {
          name: 'user2',
          balance: 5000,
          version: 1,
        },
      }),
      prismaService.user.create({
        data: {
          name: 'user3',
          balance: 3000,
          version: 1,
        },
      }),
      prismaService.user.create({
        data: {
          name: 'user4',
          balance: 2000,
          version: 1,
        },
      }),
    ]);
  });

  afterAll(async () => {
    await prismaService.operation.deleteMany();
    await prismaService.user.deleteMany();
    await prismaService.$disconnect();
  });

  beforeEach(async () => {
    // Сбрасываем балансы пользователей перед каждым тестом
    await Promise.all(
      testUsers.map((user, index) =>
        prismaService.user.update({
          where: { id: user.id },
          data: {
            balance: [10000, 5000, 3000, 2000][index],
            version: 1,
          },
        }),
      ),
    );
  });

  const runConcurrentTransactions = async (
    transactionCount: number,
    amount: number = 100,
    delayMs: number = 0,
  ) => {
    const transactions = Array.from(
      { length: transactionCount },
      (_, index) => {
        const senderId = testUsers[index % testUsers.length].id;
        const receiverId = testUsers[(index + 1) % testUsers.length].id;

        return async () => {
          if (delayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }

          try {
            return await service.runTransaction({
              amount,
              senderId,
              receiverId,
            });
          } catch (error) {
            return { error: (error as Error).message };
          }
        };
      },
    );

    const start = performance.now();
    const results = await Promise.allSettled(transactions.map((tx) => tx()));
    const end = performance.now();

    const successful = results.filter(
      (r) => r.status === 'fulfilled' && !('error' in (r.value as any)),
    ).length;
    const failed = results.length - successful;

    return {
      duration: end - start,
      successful,
      failed,
      results: results.map((r) =>
        r.status === 'fulfilled' ? r.value : (r.reason as Error).message,
      ),
    };
  };

  describe('Real Database Transaction Performance Tests', () => {
    it('should handle 10 concurrent transactions with pessimistic lock', async () => {
      process.env.TRANSACTION_STRATEGY = TransactionStrategy.PESSIMISTIC;

      const result = await runConcurrentTransactions(10, 50);

      expect(result.successful).toBeGreaterThan(0);
    }, 30000);

    it('should handle 50 concurrent transactions with optimistic lock', async () => {
      process.env.TRANSACTION_STRATEGY = TransactionStrategy.OPTIMISTIC;

      const result = await runConcurrentTransactions(50, 30);

      expect(result.successful).toBeGreaterThan(0);
    }, 30000);

    it('should handle 100 concurrent transactions with atomic lock', async () => {
      process.env.TRANSACTION_STRATEGY = TransactionStrategy.ATOMIC;

      const result = await runConcurrentTransactions(100, 20);

      expect(result.successful).toBeGreaterThan(0);
    }, 60000);

    it('should handle 200 concurrent transactions with isolation lock', async () => {
      process.env.TRANSACTION_STRATEGY = TransactionStrategy.ISOLATION;

      const result = await runConcurrentTransactions(200, 10);

      expect(result.successful).toBeGreaterThan(0);
    }, 120000);

    it('should compare performance between different strategies', async () => {
      const strategies = [
        TransactionStrategy.PESSIMISTIC,
        TransactionStrategy.OPTIMISTIC,
        TransactionStrategy.ATOMIC,
        TransactionStrategy.ISOLATION,
      ];

      const results: Array<{
        strategy: TransactionStrategy;
        duration: number;
        successful: number;
        failed: number;
        results: any[];
      }> = [];

      for (const strategy of strategies) {
        process.env.TRANSACTION_STRATEGY = strategy;
        const result = await runConcurrentTransactions(50, 25);
        results.push({
          strategy,
          ...result,
        });
      }

      expect(results).toHaveLength(4);
    }, 120000);

    it('should test high load scenario with staggered requests', async () => {
      process.env.TRANSACTION_STRATEGY = TransactionStrategy.PESSIMISTIC;

      const result = await runConcurrentTransactions(100, 15, 10); // 10ms delay between requests

      expect(result.successful).toBeGreaterThan(0);
    }, 60000);

    it('should test extreme load scenario', async () => {
      process.env.TRANSACTION_STRATEGY = TransactionStrategy.OPTIMISTIC;

      const result = await runConcurrentTransactions(500, 5);

      expect(result.successful).toBeGreaterThan(0);
    }, 180000);
  });
});
