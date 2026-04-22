CREATE TABLE "request_logs" (
    "id" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "query" TEXT,
    "ip" TEXT,
    "user_agent" TEXT,
    "request_headers" JSONB NOT NULL,
    "request_body" JSONB,
    "response_status" INTEGER,
    "response_headers" JSONB,
    "response_body" JSONB,
    "duration_ms" INTEGER,
    "tenant_id" TEXT,
    "user_id" TEXT,
    "user_type" TEXT,
    "is_redirect" BOOLEAN NOT NULL DEFAULT false,
    "redirect_to" TEXT,
    "error_message" TEXT,
    "error_stack" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "request_logs_created_at_idx" ON "request_logs"("created_at" DESC);
CREATE INDEX "request_logs_method_idx" ON "request_logs"("method");
CREATE INDEX "request_logs_response_status_idx" ON "request_logs"("response_status");
CREATE INDEX "request_logs_tenant_id_idx" ON "request_logs"("tenant_id");
CREATE INDEX "request_logs_user_id_idx" ON "request_logs"("user_id");
