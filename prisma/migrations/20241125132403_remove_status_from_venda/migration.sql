/*
  Warnings:

  - You are about to drop the column `status` on the `Venda` table. All the data in the column will be lost.
  - The `transStatus` column on the `Venda` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Venda" DROP COLUMN "status",
DROP COLUMN "transStatus",
ADD COLUMN     "transStatus" "Status" NOT NULL DEFAULT 'PENDENTE';
