/*
  Warnings:

  - Added the required column `transKey` to the `Venda` table without a default value. This is not possible if the table is not empty.
  - Added the required column `transPayment` to the `Venda` table without a default value. This is not possible if the table is not empty.
  - Added the required column `transStatus` to the `Venda` table without a default value. This is not possible if the table is not empty.
  - Added the required column `transValue` to the `Venda` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Venda" ADD COLUMN     "transKey" TEXT NOT NULL,
ADD COLUMN     "transPayment" INTEGER NOT NULL,
ADD COLUMN     "transPaymentDate" TIMESTAMP(3),
ADD COLUMN     "transPaymentUrl" TEXT,
ADD COLUMN     "transStatus" TEXT NOT NULL,
ADD COLUMN     "transValue" INTEGER NOT NULL;
