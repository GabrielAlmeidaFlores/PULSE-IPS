-- AlterTable
ALTER TABLE "workforce_insights" ADD COLUMN     "action_plan_id" TEXT;

-- AddForeignKey
ALTER TABLE "workforce_insights" ADD CONSTRAINT "workforce_insights_action_plan_id_fkey" FOREIGN KEY ("action_plan_id") REFERENCES "action_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
