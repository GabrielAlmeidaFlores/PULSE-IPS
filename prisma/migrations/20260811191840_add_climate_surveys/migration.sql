/*
  Warnings:

  - You are about to drop the `user_notification_preferences` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "user_notification_preferences" DROP CONSTRAINT "user_notification_preferences_user_id_fkey";

-- AlterTable
ALTER TABLE "action_plans" ADD COLUMN     "climate_survey_dispatch_id" TEXT;

-- AlterTable
ALTER TABLE "health_survey_response_tokens" ALTER COLUMN "reminder_sent_at" SET DATA TYPE TIMESTAMP(3);

-- DropTable
DROP TABLE "user_notification_preferences";

-- CreateTable
CREATE TABLE "climate_survey_config_work_days" (
    "config_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,

    CONSTRAINT "climate_survey_config_work_days_pkey" PRIMARY KEY ("config_id","day_of_week")
);

-- CreateTable
CREATE TABLE "climate_survey_configurations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Pesquisa de Clima',
    "description" TEXT,
    "frequency" TEXT NOT NULL,
    "scheduled_day_of_month" INTEGER,
    "dispatch_time" VARCHAR(5) NOT NULL DEFAULT '09:00',
    "respect_employee_schedule" BOOLEAN NOT NULL DEFAULT false,
    "token_expiry_hours" INTEGER NOT NULL DEFAULT 48,
    "send_via_messaging" BOOLEAN NOT NULL DEFAULT true,
    "send_via_signed_link" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "climate_survey_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "climate_survey_questions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "climate_survey_configuration_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "score_direction" TEXT NOT NULL DEFAULT 'higher_is_better',
    "dimension" TEXT NOT NULL DEFAULT 'organizational_culture',
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "climate_survey_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "climate_survey_dispatches" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "climate_survey_configuration_id" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "dispatched_at" TIMESTAMP(3),
    "adherence_checked_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "source" TEXT NOT NULL DEFAULT 'auto',
    "signed_link_token" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "climate_survey_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "climate_survey_response_tokens" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "dispatch_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "short_code" VARCHAR(7),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "work_start_time" VARCHAR(5) NOT NULL,
    "work_end_time" VARCHAR(5) NOT NULL,
    "used_at" TIMESTAMP(3),
    "reminder_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "climate_survey_response_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "climate_survey_response_token_work_days" (
    "token_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,

    CONSTRAINT "climate_survey_response_token_work_days_pkey" PRIMARY KEY ("token_id","day_of_week")
);

-- CreateTable
CREATE TABLE "climate_survey_responses" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "dispatch_id" TEXT NOT NULL,
    "department_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "climate_survey_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "climate_survey_response_items" (
    "id" TEXT NOT NULL,
    "climate_survey_response_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,

    CONSTRAINT "climate_survey_response_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "climate_survey_config_departments" (
    "config_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,

    CONSTRAINT "climate_survey_config_departments_pkey" PRIMARY KEY ("config_id","department_id")
);

-- CreateTable
CREATE TABLE "climate_survey_dept_dispatches" (
    "id" TEXT NOT NULL,
    "dispatch_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "total_recipients" INTEGER NOT NULL DEFAULT 0,
    "total_responses" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "climate_survey_dept_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "climate_survey_configurations_tenant_id_idx" ON "climate_survey_configurations"("tenant_id");

-- CreateIndex
CREATE INDEX "climate_survey_questions_tenant_id_idx" ON "climate_survey_questions"("tenant_id");

-- CreateIndex
CREATE INDEX "climate_survey_questions_tenant_id_climate_survey_configura_idx" ON "climate_survey_questions"("tenant_id", "climate_survey_configuration_id");

-- CreateIndex
CREATE UNIQUE INDEX "climate_survey_dispatches_signed_link_token_key" ON "climate_survey_dispatches"("signed_link_token");

-- CreateIndex
CREATE INDEX "climate_survey_dispatches_tenant_id_idx" ON "climate_survey_dispatches"("tenant_id");

-- CreateIndex
CREATE INDEX "climate_survey_dispatches_tenant_id_status_scheduled_at_idx" ON "climate_survey_dispatches"("tenant_id", "status", "scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "climate_survey_response_tokens_token_key" ON "climate_survey_response_tokens"("token");

-- CreateIndex
CREATE INDEX "climate_survey_response_tokens_tenant_id_idx" ON "climate_survey_response_tokens"("tenant_id");

-- CreateIndex
CREATE INDEX "climate_survey_response_tokens_dispatch_id_employee_id_idx" ON "climate_survey_response_tokens"("dispatch_id", "employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "climate_survey_response_tokens_tenant_id_short_code_key" ON "climate_survey_response_tokens"("tenant_id", "short_code");

-- CreateIndex
CREATE INDEX "climate_survey_responses_tenant_id_idx" ON "climate_survey_responses"("tenant_id");

-- CreateIndex
CREATE INDEX "climate_survey_responses_dispatch_id_idx" ON "climate_survey_responses"("dispatch_id");

-- CreateIndex
CREATE INDEX "climate_survey_response_items_climate_survey_response_id_idx" ON "climate_survey_response_items"("climate_survey_response_id");

-- CreateIndex
CREATE INDEX "climate_survey_config_departments_department_id_idx" ON "climate_survey_config_departments"("department_id");

-- CreateIndex
CREATE INDEX "climate_survey_dept_dispatches_department_id_idx" ON "climate_survey_dept_dispatches"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "climate_survey_dept_dispatches_dispatch_id_department_id_key" ON "climate_survey_dept_dispatches"("dispatch_id", "department_id");

-- CreateIndex
CREATE INDEX "action_plans_climate_survey_dispatch_id_idx" ON "action_plans"("climate_survey_dispatch_id");

-- AddForeignKey
ALTER TABLE "climate_survey_config_work_days" ADD CONSTRAINT "climate_survey_config_work_days_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "climate_survey_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "climate_survey_configurations" ADD CONSTRAINT "climate_survey_configurations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "climate_survey_questions" ADD CONSTRAINT "climate_survey_questions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "climate_survey_questions" ADD CONSTRAINT "climate_survey_questions_climate_survey_configuration_id_fkey" FOREIGN KEY ("climate_survey_configuration_id") REFERENCES "climate_survey_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "climate_survey_dispatches" ADD CONSTRAINT "climate_survey_dispatches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "climate_survey_dispatches" ADD CONSTRAINT "climate_survey_dispatches_climate_survey_configuration_id_fkey" FOREIGN KEY ("climate_survey_configuration_id") REFERENCES "climate_survey_configurations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "climate_survey_response_tokens" ADD CONSTRAINT "climate_survey_response_tokens_dispatch_id_fkey" FOREIGN KEY ("dispatch_id") REFERENCES "climate_survey_dispatches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "climate_survey_response_tokens" ADD CONSTRAINT "climate_survey_response_tokens_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "climate_survey_response_token_work_days" ADD CONSTRAINT "climate_survey_response_token_work_days_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "climate_survey_response_tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "climate_survey_responses" ADD CONSTRAINT "climate_survey_responses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "climate_survey_responses" ADD CONSTRAINT "climate_survey_responses_dispatch_id_fkey" FOREIGN KEY ("dispatch_id") REFERENCES "climate_survey_dispatches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "climate_survey_responses" ADD CONSTRAINT "climate_survey_responses_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "climate_survey_response_items" ADD CONSTRAINT "climate_survey_response_items_climate_survey_response_id_fkey" FOREIGN KEY ("climate_survey_response_id") REFERENCES "climate_survey_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "climate_survey_response_items" ADD CONSTRAINT "climate_survey_response_items_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "climate_survey_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "climate_survey_config_departments" ADD CONSTRAINT "climate_survey_config_departments_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "climate_survey_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "climate_survey_config_departments" ADD CONSTRAINT "climate_survey_config_departments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "climate_survey_dept_dispatches" ADD CONSTRAINT "climate_survey_dept_dispatches_dispatch_id_fkey" FOREIGN KEY ("dispatch_id") REFERENCES "climate_survey_dispatches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "climate_survey_dept_dispatches" ADD CONSTRAINT "climate_survey_dept_dispatches_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_plans" ADD CONSTRAINT "action_plans_climate_survey_dispatch_id_fkey" FOREIGN KEY ("climate_survey_dispatch_id") REFERENCES "climate_survey_dispatches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
