CREATE TABLE "job_logs" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "job_name" TEXT NOT NULL,
    "queue_name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "max_attempts" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB,
    "result" JSONB,
    "error_message" TEXT,
    "error_stack" TEXT,
    "queued_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ,
    "finished_at" TIMESTAMPTZ,
    "duration_ms" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "job_logs_created_at_idx" ON "job_logs"("created_at" DESC);
CREATE INDEX "job_logs_job_name_idx" ON "job_logs"("job_name");
CREATE INDEX "job_logs_status_idx" ON "job_logs"("status");
CREATE INDEX "job_logs_queue_name_idx" ON "job_logs"("queue_name");
