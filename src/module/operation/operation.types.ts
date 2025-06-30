export type TransactionPayload = {
  amount: number;
  senderId: number;
  receiverId: number;
};

export enum TransactionStrategy {
  PESSIMISTIC = 'PESSIMISTIC',
  OPTIMISTIC = 'OPTIMISTIC',
  ATOMIC = 'ATOMIC',
  ISOLATION = 'ISOLATION',
}

export enum IsolationLevel {
  READ_UNCOMMITTED = 'ReadUncommitted',
  READ_COMMITTED = 'ReadCommitted',
  REPEATABLE_READ = 'RepeatableRead',
  SERIALIZABLE = 'Serializable',
}
