/*
  Warnings:

  - The primary key for the `FilaEmail` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `atualizadoEm` on the `FilaEmail` table. All the data in the column will be lost.
  - You are about to drop the column `criadoEm` on the `FilaEmail` table. All the data in the column will be lost.
  - The primary key for the `UsuarioQpanel` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `token` on the `UsuarioQpanel` table. All the data in the column will be lost.
  - You are about to drop the column `tokenExpiresAt` on the `UsuarioQpanel` table. All the data in the column will be lost.
  - The primary key for the `Venda` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `usuarioId` on the `Venda` table. All the data in the column will be lost.
  - Added the required column `usuarioId` to the `FilaEmail` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Venda" DROP CONSTRAINT "Venda_usuarioId_fkey";

-- AlterTable
ALTER TABLE "FilaEmail" DROP CONSTRAINT "FilaEmail_pkey",
DROP COLUMN "atualizadoEm",
DROP COLUMN "criadoEm",
ADD COLUMN     "cretries" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "usuarioId" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "FilaEmail_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "FilaEmail_id_seq";

-- AlterTable
ALTER TABLE "UsuarioQpanel" DROP CONSTRAINT "UsuarioQpanel_pkey",
DROP COLUMN "token",
DROP COLUMN "tokenExpiresAt",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "UsuarioQpanel_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "UsuarioQpanel_id_seq";

-- AlterTable
ALTER TABLE "Venda" DROP CONSTRAINT "Venda_pkey",
DROP COLUMN "usuarioId",
ADD COLUMN     "usuarioQpanelId" TEXT,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Venda_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Venda_id_seq";

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_usuarioQpanelId_fkey" FOREIGN KEY ("usuarioQpanelId") REFERENCES "UsuarioQpanel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
