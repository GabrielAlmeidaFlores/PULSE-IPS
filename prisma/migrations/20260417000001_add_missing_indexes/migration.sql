-- Add missing indexes for foreign keys

-- BillingWebhookEvent: index on tenantId
CREATE INDEX "billing_webhook_events_tenant_id_idx" ON "billing_webhook_events"("tenant_id");

-- ActionPlanTask: index on actionPlanId
CREATE INDEX "action_plan_tasks_action_plan_id_idx" ON "action_plan_tasks"("action_plan_id");

-- DocumentVersion: index on documentId
CREATE INDEX "document_versions_document_id_idx" ON "document_versions"("document_id");
