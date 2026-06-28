-- CreateTable
CREATE TABLE "webhook_events" (
    "id" UUID NOT NULL,
    "idempotency_key" VARCHAR(255) NOT NULL,
    "source" VARCHAR(30) NOT NULL DEFAULT 'openwa',
    "event" VARCHAR(50) NOT NULL,
    "processed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_idempotency_key_key" ON "webhook_events"("idempotency_key");

-- CreateIndex
CREATE INDEX "idx_webhook_events_processed" ON "webhook_events"("processed_at" DESC);
