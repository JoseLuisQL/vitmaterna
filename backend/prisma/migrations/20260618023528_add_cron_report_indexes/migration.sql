-- CreateIndex
CREATE INDEX "idx_appointments_estado_fecha" ON "appointments"("estado", "fecha");

-- CreateIndex
CREATE INDEX "idx_notifications_tipo_created" ON "notifications"("tipo", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_treatments_estado" ON "treatments"("estado");
