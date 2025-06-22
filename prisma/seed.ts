import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function seedUsers(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await prisma.user.create({
      data: {
        name: faker.person.fullName(),
        balance: faker.number.int({ min: 0, max: 1000 }),
        version: 1,
        sent: {
          create: [],
        },
        received: {
          create: [],
        },
      },
    });
  }
}

async function main(): Promise<void> {
  console.log('Start seeding...');
  await seedUsers();
  console.log('Seeding finished.');
}
(async (): Promise<void> => {
  try {
    await main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
})();
