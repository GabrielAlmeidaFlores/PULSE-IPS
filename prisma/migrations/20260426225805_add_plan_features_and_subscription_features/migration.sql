/*
  Warnings:

  - Made the column `department_id` on table `pgr_question_results` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "department_work_days" DROP CONSTRAINT "department_work_days_department_id_fkey";

-- DropForeignKey
ALTER TABLE "employee_work_days" DROP CONSTRAINT "employee_work_days_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "pgr_dept_results" DROP CONSTRAINT "pgr_dept_results_department_id_fkey";

-- DropForeignKey
ALTER TABLE "pgr_question_results" DROP CONSTRAINT "fk_pgr_question_results_dept";

-- DropForeignKey
ALTER TABLE "survey_config_work_days" DROP CONSTRAINT "survey_config_work_days_config_id_fkey";

-- AlterTable
ALTER TABLE "job_logs" ALTER COLUMN "queued_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "started_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "finished_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "pgr_question_results" ALTER COLUMN "department_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "request_logs" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "survey_questions" ALTER COLUMN "score_direction" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "plan_features" (
    "plan_id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,

    CONSTRAINT "plan_features_pkey" PRIMARY KEY ("plan_id","feature")
);

-- CreateTable
CREATE TABLE "subscription_features" (
    "subscription_id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,

    CONSTRAINT "subscription_features_pkey" PRIMARY KEY ("subscription_id","feature")
);

-- AddForeignKey
ALTER TABLE "plan_features" ADD CONSTRAINT "plan_features_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_features" ADD CONSTRAINT "subscription_features_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "organization_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_work_days" ADD CONSTRAINT "department_work_days_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_work_days" ADD CONSTRAINT "employee_work_days_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_config_work_days" ADD CONSTRAINT "survey_config_work_days_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "survey_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pgr_dept_results" ADD CONSTRAINT "pgr_dept_results_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pgr_question_results" ADD CONSTRAINT "pgr_question_results_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
