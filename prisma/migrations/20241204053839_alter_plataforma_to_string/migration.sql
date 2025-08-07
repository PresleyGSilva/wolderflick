-- Passo 1: Adicionar a nova coluna temporária
ALTER TABLE "Venda" ADD COLUMN "plataforma_temp" TEXT;

-- Passo 2: Copiar os dados da coluna antiga para a nova
UPDATE "Venda" SET "plataforma_temp" = "plataforma";

-- Passo 3: Excluir a coluna antiga
ALTER TABLE "Venda" DROP COLUMN "plataforma";

-- Passo 4: Renomear a coluna temporária para o nome original
ALTER TABLE "Venda" RENAME COLUMN "plataforma_temp" TO "plataforma";
