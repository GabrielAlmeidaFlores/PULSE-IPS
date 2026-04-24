CREATE TABLE "action_plan_suggestions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "suggestion_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "dismissed_at" TIMESTAMP(3),
    "dismissed_by" TEXT,
    "action_plan_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "action_plan_suggestions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "action_plan_suggestion_tasks" (
    "id" TEXT NOT NULL,
    "suggestion_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "action_plan_suggestion_tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "action_plan_suggestions_tenant_id_status_idx" ON "action_plan_suggestions"("tenant_id", "status");
CREATE INDEX "action_plan_suggestions_tenant_id_suggestion_key_idx" ON "action_plan_suggestions"("tenant_id", "suggestion_key");
CREATE INDEX "action_plan_suggestion_tasks_suggestion_id_idx" ON "action_plan_suggestion_tasks"("suggestion_id");

ALTER TABLE "action_plan_suggestions" ADD CONSTRAINT "action_plan_suggestions_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "action_plan_suggestions" ADD CONSTRAINT "action_plan_suggestions_dismissed_by_fkey"
    FOREIGN KEY ("dismissed_by") REFERENCES "organization_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "action_plan_suggestion_tasks" ADD CONSTRAINT "action_plan_suggestion_tasks_suggestion_id_fkey"
    FOREIGN KEY ("suggestion_id") REFERENCES "action_plan_suggestions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
