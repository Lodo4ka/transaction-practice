import { PrismaClient } from '@prisma/client';
import { execSync } from 'node:child_process';
import { resetDb } from './reset-db';
const baseUrl = process.env.DATABASE_URL as string;
const workerId = process.env.JEST_WORKER_ID ?? '1';
const schema = `test_worker_${workerId}`;

const url = new URL(baseUrl);
url.searchParams.set('schema', schema);
process.env.DATABASE_URL = url.toString();

const prisma = new PrismaClient();

beforeAll(async () => {
  await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  execSync('npx prisma db push --skip-generate', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url.toString() },
  });
});

afterEach(async () => {
  await resetDb(prisma);
});
