/*
  Warnings:

  - The values [KIVANO] on the enum `Plataforma` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Plataforma_new" AS ENUM ('BRAIP', 'KIRVANO', 'MONETIZZE');
ALTER TABLE "Venda" ALTER COLUMN "plataforma" TYPE "Plataforma_new" USING ("plataforma"::text::"Plataforma_new");
ALTER TYPE "Plataforma" RENAME TO "Plataforma_old";
ALTER TYPE "Plataforma_new" RENAME TO "Plataforma";
DROP TYPE "Plataforma_old";
COMMIT;

-- AlterTable
ALTER TABLE "Venda" ADD COLUMN     "processada" BOOLEAN NOT NULL DEFAULT false;
