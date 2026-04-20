ALTER TABLE "action_plan_tasks" DROP COLUMN IF EXISTS "tenant_id";
ALTER TABLE "action_plan_tasks" ADD COLUMN "tenant_id" TEXT;
UPDATE "action_plan_tasks" t SET "tenant_id" = ap."tenant_id" FROM "action_plans" ap WHERE t."action_plan_id" = ap."id";
ALTER TABLE "action_plan_tasks" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "action_plan_tasks" ADD CONSTRAINT "action_plan_tasks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "action_plan_tasks_tenant_id_idx" ON "action_plan_tasks"("tenant_id");
