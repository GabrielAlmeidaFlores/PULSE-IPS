/*
  Warnings:

  - A unique constraint covering the columns `[action_plan_id]` on the table `action_plan_suggestions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "action_plans" ADD COLUMN     "alert_id" TEXT,
ADD COLUMN     "report_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "action_plan_suggestions_action_plan_id_key" ON "action_plan_suggestions"("action_plan_id");

-- AddForeignKey
ALTER TABLE "action_plans" ADD CONSTRAINT "action_plans_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "alerts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_plans" ADD CONSTRAINT "action_plans_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "anonymous_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_plan_suggestions" ADD CONSTRAINT "action_plan_suggestions_action_plan_id_fkey" FOREIGN KEY ("action_plan_id") REFERENCES "action_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
