/*
  Warnings:

  - You are about to drop the `UsuarioQpanel` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Venda" DROP CONSTRAINT "Venda_usuarioQpanelId_fkey";

-- DropTable
DROP TABLE "public"."UsuarioQpanel";

-- CreateTable
CREATE TABLE "usuarios_qpanel" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "package_id" TEXT,
    "atualizadoEm" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "dataExpiracao" TIMESTAMP(3) NOT NULL,
    "enviadoTelegram" BOOLEAN NOT NULL DEFAULT false,
    "celular" TEXT NOT NULL DEFAULT 'N/A',
    "ultimaRenovacao" TIMESTAMP(6),

    CONSTRAINT "usuarios_qpanel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "afiliado" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "criado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chip" TEXT,
    "enviado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "afiliado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_qpanel_email_key" ON "usuarios_qpanel"("email");

-- CreateIndex
CREATE UNIQUE INDEX "afiliado_numero_key" ON "afiliado"("numero");

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_usuarioQpanelId_fkey" FOREIGN KEY ("usuarioQpanelId") REFERENCES "usuarios_qpanel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
