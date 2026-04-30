/*
  Warnings:

  - You are about to drop the column `uploaded_by` on the `document_versions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "document_versions" DROP COLUMN "uploaded_by",
ADD COLUMN     "uploaded_by_id" TEXT;

-- AlterTable
ALTER TABLE "health_survey_config_work_days" RENAME CONSTRAINT "survey_config_work_days_pkey" TO "health_survey_config_work_days_pkey";

-- AlterTable
ALTER TABLE "health_survey_configurations" RENAME CONSTRAINT "survey_configurations_pkey" TO "health_survey_configurations_pkey";

-- AlterTable
ALTER TABLE "health_survey_dispatches" RENAME CONSTRAINT "survey_dispatches_pkey" TO "health_survey_dispatches_pkey";

-- AlterTable
ALTER TABLE "health_survey_questions" RENAME CONSTRAINT "survey_questions_pkey" TO "health_survey_questions_pkey";

-- AlterTable
ALTER TABLE "health_survey_response_items" RENAME CONSTRAINT "survey_response_items_pkey" TO "health_survey_response_items_pkey";

-- AlterTable
ALTER TABLE "health_survey_response_tokens" RENAME CONSTRAINT "survey_response_tokens_pkey" TO "health_survey_response_tokens_pkey";

-- AlterTable
ALTER TABLE "health_survey_responses" RENAME CONSTRAINT "survey_responses_pkey" TO "health_survey_responses_pkey";

-- RenameForeignKey
ALTER TABLE "health_survey_config_work_days" RENAME CONSTRAINT "survey_config_work_days_config_id_fkey" TO "health_survey_config_work_days_config_id_fkey";

-- RenameForeignKey
ALTER TABLE "health_survey_configurations" RENAME CONSTRAINT "survey_configurations_department_id_fkey" TO "health_survey_configurations_department_id_fkey";

-- RenameForeignKey
ALTER TABLE "health_survey_configurations" RENAME CONSTRAINT "survey_configurations_tenant_id_fkey" TO "health_survey_configurations_tenant_id_fkey";

-- RenameForeignKey
ALTER TABLE "health_survey_dispatches" RENAME CONSTRAINT "survey_dispatches_survey_configuration_id_fkey" TO "health_survey_dispatches_health_survey_configuration_id_fkey";

-- RenameForeignKey
ALTER TABLE "health_survey_dispatches" RENAME CONSTRAINT "survey_dispatches_tenant_id_fkey" TO "health_survey_dispatches_tenant_id_fkey";

-- RenameForeignKey
ALTER TABLE "health_survey_questions" RENAME CONSTRAINT "survey_questions_survey_configuration_id_fkey" TO "health_survey_questions_health_survey_configuration_id_fkey";

-- RenameForeignKey
ALTER TABLE "health_survey_questions" RENAME CONSTRAINT "survey_questions_tenant_id_fkey" TO "health_survey_questions_tenant_id_fkey";

-- RenameForeignKey
ALTER TABLE "health_survey_response_items" RENAME CONSTRAINT "survey_response_items_question_id_fkey" TO "health_survey_response_items_question_id_fkey";

-- RenameForeignKey
ALTER TABLE "health_survey_response_items" RENAME CONSTRAINT "survey_response_items_survey_response_id_fkey" TO "health_survey_response_items_health_survey_response_id_fkey";

-- RenameForeignKey
ALTER TABLE "health_survey_response_tokens" RENAME CONSTRAINT "survey_response_tokens_dispatch_id_fkey" TO "health_survey_response_tokens_dispatch_id_fkey";

-- RenameForeignKey
ALTER TABLE "health_survey_response_tokens" RENAME CONSTRAINT "survey_response_tokens_employee_id_fkey" TO "health_survey_response_tokens_employee_id_fkey";

-- RenameForeignKey
ALTER TABLE "health_survey_responses" RENAME CONSTRAINT "survey_responses_dispatch_id_fkey" TO "health_survey_responses_dispatch_id_fkey";

-- RenameForeignKey
ALTER TABLE "health_survey_responses" RENAME CONSTRAINT "survey_responses_tenant_id_fkey" TO "health_survey_responses_tenant_id_fkey";

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "organization_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "survey_configurations_tenant_id_department_id_key" RENAME TO "health_survey_configurations_tenant_id_department_id_key";

-- RenameIndex
ALTER INDEX "survey_configurations_tenant_id_idx" RENAME TO "health_survey_configurations_tenant_id_idx";

-- RenameIndex
ALTER INDEX "survey_dispatches_tenant_id_idx" RENAME TO "health_survey_dispatches_tenant_id_idx";

-- RenameIndex
ALTER INDEX "survey_dispatches_tenant_id_status_scheduled_at_idx" RENAME TO "health_survey_dispatches_tenant_id_status_scheduled_at_idx";

-- RenameIndex
ALTER INDEX "survey_questions_tenant_id_idx" RENAME TO "health_survey_questions_tenant_id_idx";

-- RenameIndex
ALTER INDEX "survey_response_tokens_tenant_id_idx" RENAME TO "health_survey_response_tokens_tenant_id_idx";

-- RenameIndex
ALTER INDEX "survey_response_tokens_token_key" RENAME TO "health_survey_response_tokens_token_key";

-- RenameIndex
ALTER INDEX "survey_responses_tenant_id_idx" RENAME TO "health_survey_responses_tenant_id_idx";
