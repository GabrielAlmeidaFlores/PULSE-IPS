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


