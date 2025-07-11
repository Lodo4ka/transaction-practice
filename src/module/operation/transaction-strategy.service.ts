import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Operation, OperationStatus, User } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import {
  IsolationLevel,
  TransactionPayload,
  TransactionStrategy,
} from './operation.types';
import { ConfigService } from '@nestjs/config';
import { CacheManagerStore } from 'cache-manager';

@Injectable()
export class TransactionStrategyService {
  constructor(
    private readonly prisma: PrismaService,
    // @Inject(CACHE_MANAGER) private cacheManager: Keyv,
    @Inject(CACHE_MANAGER) private cacheManager: CacheManagerStore,
    private readonly configService: ConfigService,
  ) {}

  validateSender(
    userSender: Partial<User> | null,
    amount: number,
  ): asserts userSender is Partial<User> {
    if (!userSender) {
      throw new BadRequestException('Sender not found');
    }
    if (userSender.balance?.lessThan(amount)) {
      throw new BadRequestException('Insufficient balance');
    }
  }

  getCurrentIsolationLevel() {
    return (
      this.configService.get<IsolationLevel>('ISOLATION_LEVEL') ??
      IsolationLevel.READ_COMMITTED
    );
  }

  async clearCacheRedis(senderId: number, receiverId: number) {
    return this.cacheManager.mdel(
      `/user/${senderId}/balance`,
      `/user/${receiverId}/balance`,
      `/admin/transactions`,
    );
  }

  // Пессимистичный лок — это подход, при котором мы "блокируем" ресурсы на время выполнения операции, чтобы избежать конфликтов. В данном случае блокировка достигается не явным lock-запросом, а использованием транзакции, которая удерживает блокировки на изменяемых строках до завершения.
  async pessimisticLock({
    amount,
    senderId,
    receiverId,
  }: TransactionPayload): Promise<Operation> {
    const isolationLevel = this.getCurrentIsolationLevel();
    return this.prisma.$transaction(
      async (tx) => {
        // Получаем и блокируем отправителя
        const [userSender] = await tx.$queryRaw<User[]>`
        SELECT * FROM "User" WHERE id = ${senderId} FOR UPDATE
      `;
        if (!userSender) {
          throw new BadRequestException('Sender not found');
        }
        // Получаем и блокируем получателя
        const [receiver] = await tx.$queryRaw<User[]>`
        SELECT * FROM "User" WHERE id = ${receiverId} FOR UPDATE
      `;
        if (!receiver) {
          throw new BadRequestException('Receiver not found');
        }
        if (userSender.balance.lessThan(amount)) {
          throw new BadRequestException('Insufficient balance');
        }
        // Обновляем баланс отправителя
        await tx.user.update({
          where: { id: userSender.id },
          data: {
            balance: { decrement: amount },
          },
        });
        // Обновляем баланс получателя
        await tx.user.update({
          where: { id: receiver.id },
          data: {
            balance: { increment: amount },
          },
        });
        // Создаем операцию
        const operation = await tx.operation.create({
          data: {
            amount,
            senderId,
            receiverId,
            status: OperationStatus.SUCCESS,
          },
        });
        // Очищаем кэш
        await this.clearCacheRedis(senderId, receiverId);
        return operation;
      },
      {
        isolationLevel,
      },
    );
  }
  // Оптимистичная блокировка — это подход к обеспечению целостности данных при параллельных изменениях, при котором не происходит явной блокировки записей в базе данных. Вместо этого:
  // 1. При каждом изменении данных мы увеличиваем версию строки.
  // 2. При чтении данных мы считываем версию строки.
  // 3. При обновлении данных мы проверяем, что версия строки не изменилась с момента последнего чтения.
  // 4. Если версия изменилась, то мы повторяем операцию.
  // 5. Если версия не изменилась, то мы обновляем данные.
  async optimisticLock({
    amount,
    senderId,
    receiverId,
  }: TransactionPayload): Promise<Operation> {
    const isolationLevel = this.getCurrentIsolationLevel();
    return this.prisma.$transaction(
      async (tx) => {
        const userSender = await tx.user.findUnique({
          where: {
            id: senderId,
          },
          select: {
            balance: true,
            id: true,
            version: true,
          },
        });
        this.validateSender(userSender, amount);
        const updatedSender = await tx.user.update({
          where: { id: userSender.id, version: userSender.version },
          data: {
            balance: { decrement: amount },
            version: { increment: 1 },
          },
        });
        if (updatedSender.version !== userSender.version + 1) {
          throw new BadRequestException('Optimistic lock failed');
        }
        const userReceiver = await tx.user.findUnique({
          where: {
            id: receiverId,
          },
          select: {
            balance: true,
            id: true,
            version: true,
          },
        });
        if (!userReceiver) {
          throw new BadRequestException('Receiver not found');
        }
        const updatedReceiver = await tx.user.update({
          where: { id: userReceiver.id, version: userReceiver.version },
          data: {
            balance: { increment: amount },
            version: { increment: 1 },
          },
        });
        if (updatedReceiver.version !== userReceiver.version + 1) {
          throw new BadRequestException('Optimistic lock failed');
        }
        const operation = await tx.operation.create({
          data: {
            amount,
            senderId,
            receiverId,
            status: OperationStatus.SUCCESS,
          },
        });
        await this.clearCacheRedis(senderId, receiverId);
        return operation;
      },
      {
        isolationLevel,
      },
    );
  }
  /**
   * Атомарные изменения — это операции, которые выполняются как единое, неделимое действие:
   * либо все изменения применяются, либо ни одно не применяется (откат). Это гарантирует целостность данных
   * даже при сбоях или ошибках в процессе выполнения транзакции.
   * В данном методе перевод средств между пользователями происходит в рамках одной транзакции,
   * что обеспечивает атомарность операции.
   */
  async atomicLock({
    amount,
    senderId,
    receiverId,
  }: TransactionPayload): Promise<Operation> {
    const isolationLevel = this.getCurrentIsolationLevel();
    return this.prisma.$transaction(
      async (tx) => {
        const userSender = await tx.user.findUnique({
          where: { id: senderId },
          select: {
            balance: true,
            id: true,
            version: true,
          },
        });
        this.validateSender(userSender, amount);
        await tx.$queryRaw<void>`
        UPDATE "User" SET balance = balance - ${amount} WHERE id = ${senderId};
        UPDATE "User" SET balance = balance + ${amount} WHERE id = ${receiverId};
        `;
        const operation = await tx.operation.create({
          data: {
            amount,
            senderId,
            receiverId,
            status: OperationStatus.SUCCESS,
          },
        });
        await this.clearCacheRedis(senderId, receiverId);
        return operation;
      },
      {
        isolationLevel,
      },
    );
  }

  /**
   * Изоляция транзакции — это свойство, гарантирующее, что параллельные транзакции не влияют друг на друга
   * и выполняются так, как будто они происходят последовательно. Это предотвращает проблемы гонок,
   * грязного чтения, неповторяющихся и фантомных чтений.
   * В данном методе используется максимальный уровень изоляции (SERIALIZABLE), чтобы обеспечить корректность
   * и целостность переводов между пользователями даже при высокой конкуренции.
   * SERIALIZABLE — это самый строгий уровень изоляции транзакций в реляционных базах данных.
    Как он работает:
    Транзакции выполняются так, как будто они идут строго друг за другом, а не параллельно.
    База данных предотвращает любые ситуации, когда параллельные транзакции могут повлиять друг на друга (например, гонки, грязное чтение, неповторяющееся чтение, фантомные чтения).
    Если две транзакции пытаются изменить одни и те же данные одновременно, одна из них будет ждать или завершится с ошибкой (например, serialization failure), чтобы не нарушить целостность.
    Что это даёт:
    Гарантирует, что результат параллельных транзакций будет таким же, как если бы они выполнялись по одной.
    Исключает все типы аномалий параллелизма.
    Минусы:
    Может снижать производительность при высокой конкуренции, потому что транзакции чаще блокируются или откатываются.
   */
  async isolationLock({
    amount,
    senderId,
    receiverId,
  }: TransactionPayload): Promise<Operation> {
    return this.prisma.$transaction(
      async (tx) => {
        const userSender = await tx.user.findUnique({
          where: { id: senderId },
        });
        this.validateSender(userSender, amount);
        await tx.user.update({
          where: { id: senderId },
          data: {
            balance: { decrement: amount },
          },
        });
        await tx.user.update({
          where: { id: receiverId },
          data: {
            balance: { increment: amount },
          },
        });
        const operation = await tx.operation.create({
          data: {
            amount,
            senderId,
            receiverId,
            status: OperationStatus.SUCCESS,
          },
        });
        await this.clearCacheRedis(senderId, receiverId);
        return operation;
      },
      {
        isolationLevel: IsolationLevel.SERIALIZABLE,
      },
    );
  }

  runTransaction({ amount, senderId, receiverId }: TransactionPayload) {
    const currentTransactionStrategy =
      this.configService.get<TransactionStrategy>('TRANSACTION_STRATEGY') ??
      TransactionStrategy.PESSIMISTIC;
    const transactionStrategy: Record<
      TransactionStrategy,
      () => Promise<Operation>
    > = {
      [TransactionStrategy.PESSIMISTIC]: () =>
        this.pessimisticLock({ amount, senderId, receiverId }),
      [TransactionStrategy.OPTIMISTIC]: () =>
        this.optimisticLock({ amount, senderId, receiverId }),
      [TransactionStrategy.ATOMIC]: () =>
        this.atomicLock({ amount, senderId, receiverId }),
      [TransactionStrategy.ISOLATION]: () =>
        this.isolationLock({ amount, senderId, receiverId }),
    };
    return transactionStrategy[currentTransactionStrategy]();
  }
}
