-- AlterTable
ALTER TABLE "message_logs" ADD COLUMN     "delivered_at" TIMESTAMP(3),
ADD COLUMN     "dispatch_id" TEXT,
ADD COLUMN     "error_message" TEXT,
ADD COLUMN     "failed_at" TIMESTAMP(3),
ADD COLUMN     "queue_job_id" TEXT,
ADD COLUMN     "read_at" TIMESTAMP(3),
ADD COLUMN     "survey_link" VARCHAR(500),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "message_logs_tenant_id_dispatch_id_idx" ON "message_logs"("tenant_id", "dispatch_id");

-- CreateIndex
CREATE INDEX "message_logs_external_id_idx" ON "message_logs"("external_id");

-- CreateIndex
CREATE INDEX "message_logs_queue_job_id_idx" ON "message_logs"("queue_job_id");

-- CreateIndex
CREATE INDEX "message_logs_tenant_id_sent_at_idx" ON "message_logs"("tenant_id", "sent_at" DESC);
