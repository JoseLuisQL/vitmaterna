-- CreateTable
CREATE TABLE "recommended_content" (
    "id" UUID NOT NULL,
    "gestante_id" UUID NOT NULL,
    "content_id" UUID NOT NULL,
    "obstetra_id" UUID,
    "nota" TEXT,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "leido_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommended_content_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_recommended_gestante" ON "recommended_content"("gestante_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "uq_recommended_gestante_content" ON "recommended_content"("gestante_id", "content_id");

-- AddForeignKey
ALTER TABLE "recommended_content" ADD CONSTRAINT "recommended_content_gestante_id_fkey" FOREIGN KEY ("gestante_id") REFERENCES "gestantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommended_content" ADD CONSTRAINT "recommended_content_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "educational_content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
