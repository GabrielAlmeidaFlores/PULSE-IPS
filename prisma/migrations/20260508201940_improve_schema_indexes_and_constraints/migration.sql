-- AlterTable
ALTER TABLE "plans" ALTER COLUMN "max_employees" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "health_survey_config_departments_department_id_idx" ON "health_survey_config_departments"("department_id");

-- CreateIndex
CREATE INDEX "health_survey_dept_dispatches_department_id_idx" ON "health_survey_dept_dispatches"("department_id");

-- CreateIndex
CREATE INDEX "health_survey_response_items_health_survey_response_id_idx" ON "health_survey_response_items"("health_survey_response_id");

-- CreateIndex
CREATE INDEX "health_survey_response_tokens_dispatch_id_employee_id_idx" ON "health_survey_response_tokens"("dispatch_id", "employee_id");

-- CreateIndex
CREATE INDEX "health_survey_responses_dispatch_id_idx" ON "health_survey_responses"("dispatch_id");

-- AddForeignKey
ALTER TABLE "action_plan_tasks" ADD CONSTRAINT "action_plan_tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "organization_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "organization_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "organization_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
