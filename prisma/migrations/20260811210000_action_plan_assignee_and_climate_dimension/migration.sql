-- AlterTable
ALTER TABLE "action_plans" ADD COLUMN "assignee_id" TEXT,
ADD COLUMN "climate_survey_dimension" TEXT;

-- CreateIndex
CREATE INDEX "action_plans_climate_survey_dimension_idx" ON "action_plans"("climate_survey_dimension");

-- CreateIndex
CREATE INDEX "action_plans_assignee_id_idx" ON "action_plans"("assignee_id");

-- AddForeignKey
ALTER TABLE "action_plans" ADD CONSTRAINT "action_plans_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "organization_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
