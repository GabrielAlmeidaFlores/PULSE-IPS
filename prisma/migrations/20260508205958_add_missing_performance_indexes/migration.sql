-- CreateIndex
CREATE INDEX "alerts_tenant_id_resolved_at_idx" ON "alerts"("tenant_id", "resolved_at");

-- CreateIndex
CREATE INDEX "alerts_tenant_id_is_read_severity_idx" ON "alerts"("tenant_id", "is_read", "severity");

-- CreateIndex
CREATE INDEX "anonymous_reports_tenant_id_status_idx" ON "anonymous_reports"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_created_at_idx" ON "audit_logs"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "health_survey_questions_tenant_id_health_survey_configurati_idx" ON "health_survey_questions"("tenant_id", "health_survey_configuration_id");
