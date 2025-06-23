/*
  Warnings:

  - You are about to drop the column `date` on the `Operation` table. All the data in the column will be lost.
  - You are about to drop the column `userIdReceiver` on the `Operation` table. All the data in the column will be lost.
  - You are about to drop the column `userIdSender` on the `Operation` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `User` table. All the data in the column will be lost.
  - Added the required column `receiver_id` to the `Operation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sender_id` to the `Operation` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Operation" DROP CONSTRAINT "Operation_userIdReceiver_fkey";

-- DropForeignKey
ALTER TABLE "Operation" DROP CONSTRAINT "Operation_userIdSender_fkey";

-- AlterTable
ALTER TABLE "Operation" DROP COLUMN "date",
DROP COLUMN "userIdReceiver",
DROP COLUMN "userIdSender",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "receiver_id" INTEGER NOT NULL,
ADD COLUMN     "sender_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ALTER COLUMN "balance" SET DEFAULT 0.00,
ALTER COLUMN "balance" SET DATA TYPE DECIMAL(65,30);

-- AddForeignKey
ALTER TABLE "Operation" ADD CONSTRAINT "Operation_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Operation" ADD CONSTRAINT "Operation_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
