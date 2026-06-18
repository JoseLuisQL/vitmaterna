-- AlterEnum
ALTER TYPE "TipoMensaje" ADD VALUE 'educacion';

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "content_id" UUID;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "educational_content"("id") ON DELETE SET NULL ON UPDATE CASCADE;
