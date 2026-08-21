-- CreateTable
CREATE TABLE "climate_survey_analytics_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "config_id" TEXT,
    "dispatch_id" TEXT,
    "action_plan_id" TEXT,
    "question_id" TEXT,
    "question_order" INTEGER,
    "email_log_id" TEXT,
    "session_id" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "climate_survey_analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "climate_survey_response_sessions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "dispatch_id" TEXT NOT NULL,
    "token_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "last_question_id" TEXT,
    "last_question_order" INTEGER,
    "question_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "climate_survey_response_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "climate_survey_analytics_events_tenant_id_event_created_at_idx" ON "climate_survey_analytics_events"("tenant_id", "event", "created_at");

-- CreateIndex
CREATE INDEX "climate_survey_analytics_events_tenant_id_dispatch_id_event_idx" ON "climate_survey_analytics_events"("tenant_id", "dispatch_id", "event");

-- CreateIndex
CREATE INDEX "climate_survey_analytics_events_tenant_id_config_id_event_idx" ON "climate_survey_analytics_events"("tenant_id", "config_id", "event");

-- CreateIndex
CREATE UNIQUE INDEX "climate_survey_response_sessions_token_id_key" ON "climate_survey_response_sessions"("token_id");

-- CreateIndex
CREATE INDEX "climate_survey_response_sessions_tenant_id_dispatch_id_idx" ON "climate_survey_response_sessions"("tenant_id", "dispatch_id");

-- CreateIndex
CREATE INDEX "climate_survey_response_sessions_tenant_id_completed_at_idx" ON "climate_survey_response_sessions"("tenant_id", "completed_at");

-- AddForeignKey
ALTER TABLE "climate_survey_analytics_events" ADD CONSTRAINT "climate_survey_analytics_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "climate_survey_analytics_events" ADD CONSTRAINT "climate_survey_analytics_events_dispatch_id_fkey" FOREIGN KEY ("dispatch_id") REFERENCES "climate_survey_dispatches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "climate_survey_response_sessions" ADD CONSTRAINT "climate_survey_response_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "climate_survey_response_sessions" ADD CONSTRAINT "climate_survey_response_sessions_dispatch_id_fkey" FOREIGN KEY ("dispatch_id") REFERENCES "climate_survey_dispatches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "climate_survey_response_sessions" ADD CONSTRAINT "climate_survey_response_sessions_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "climate_survey_response_tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
