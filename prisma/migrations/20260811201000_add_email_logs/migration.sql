-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "employee_id" TEXT,
    "dispatch_id" TEXT,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "external_id" TEXT,
    "recipient_email" VARCHAR(255) NOT NULL,
    "survey_link" VARCHAR(500) NOT NULL,
    "tracking_token" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "queue_job_id" TEXT,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opened_at" TIMESTAMP(3),
    "clicked_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_logs_tracking_token_key" ON "email_logs"("tracking_token");

-- CreateIndex
CREATE INDEX "email_logs_tenant_id_idx" ON "email_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "email_logs_tenant_id_dispatch_id_idx" ON "email_logs"("tenant_id", "dispatch_id");

-- CreateIndex
CREATE INDEX "email_logs_external_id_idx" ON "email_logs"("external_id");

-- CreateIndex
CREATE INDEX "email_logs_queue_job_id_idx" ON "email_logs"("queue_job_id");

-- CreateIndex
CREATE INDEX "email_logs_tenant_id_sent_at_idx" ON "email_logs"("tenant_id", "sent_at" DESC);

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
