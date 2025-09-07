import { PrismaClient } from '@prisma/client';

export default async () => {
  const prisma = new PrismaClient();
  const url = new URL(process.env.DATABASE_URL as string);
  const schema = url.searchParams.get('schema');
  if (schema) {
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  }
  await prisma.$disconnect();
};
