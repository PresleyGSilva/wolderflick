-- AlterTable
ALTER TABLE "UsuarioQpanel" ADD COLUMN     "token" TEXT,
ADD COLUMN     "tokenExpiresAt" TIMESTAMP(3);
