/*
  Warnings:

  - Added the required column `dataExpiracao` to the `UsuarioQpanel` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "UsuarioQpanel" ADD COLUMN     "dataExpiracao" TIMESTAMP(3) NOT NULL;
