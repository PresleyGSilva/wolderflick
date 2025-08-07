/*
  Warnings:

  - Made the column `plataforma` on table `Venda` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Venda" ALTER COLUMN "plataforma" SET NOT NULL;
