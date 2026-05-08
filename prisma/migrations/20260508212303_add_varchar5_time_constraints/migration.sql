/*
  Warnings:

  - You are about to alter the column `work_start_time` on the `departments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(5)`.
  - You are about to alter the column `work_end_time` on the `departments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(5)`.
  - You are about to alter the column `work_start_time` on the `employees` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(5)`.
  - You are about to alter the column `work_end_time` on the `employees` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(5)`.
  - You are about to alter the column `dispatch_time` on the `health_survey_configurations` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(5)`.
  - You are about to alter the column `work_start_time` on the `health_survey_response_tokens` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(5)`.
  - You are about to alter the column `work_end_time` on the `health_survey_response_tokens` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(5)`.

*/
-- AlterTable
ALTER TABLE "departments" ALTER COLUMN "work_start_time" SET DATA TYPE VARCHAR(5),
ALTER COLUMN "work_end_time" SET DATA TYPE VARCHAR(5);

-- AlterTable
ALTER TABLE "employees" ALTER COLUMN "work_start_time" SET DATA TYPE VARCHAR(5),
ALTER COLUMN "work_end_time" SET DATA TYPE VARCHAR(5);

-- AlterTable
ALTER TABLE "health_survey_configurations" ALTER COLUMN "dispatch_time" SET DATA TYPE VARCHAR(5);

-- AlterTable
ALTER TABLE "health_survey_response_tokens" ALTER COLUMN "work_start_time" SET DATA TYPE VARCHAR(5),
ALTER COLUMN "work_end_time" SET DATA TYPE VARCHAR(5);

-- AddConstraints: enforce HH:MM format at database level
ALTER TABLE "departments"
  ADD CONSTRAINT "chk_departments_work_start_time_format" CHECK ("work_start_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  ADD CONSTRAINT "chk_departments_work_end_time_format"   CHECK ("work_end_time"   ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

ALTER TABLE "employees"
  ADD CONSTRAINT "chk_employees_work_start_time_format" CHECK ("work_start_time" IS NULL OR "work_start_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  ADD CONSTRAINT "chk_employees_work_end_time_format"   CHECK ("work_end_time"   IS NULL OR "work_end_time"   ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

ALTER TABLE "health_survey_configurations"
  ADD CONSTRAINT "chk_hsc_dispatch_time_format" CHECK ("dispatch_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

ALTER TABLE "health_survey_response_tokens"
  ADD CONSTRAINT "chk_hsrt_work_start_time_format" CHECK ("work_start_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  ADD CONSTRAINT "chk_hsrt_work_end_time_format"   CHECK ("work_end_time"   ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
