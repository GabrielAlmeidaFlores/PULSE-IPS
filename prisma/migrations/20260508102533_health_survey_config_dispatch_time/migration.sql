/*
  Warnings:

  - You are about to drop the column `work_end_time` on the `health_survey_configurations` table. All the data in the column will be lost.
  - You are about to drop the column `work_start_time` on the `health_survey_configurations` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "health_survey_configurations" DROP COLUMN "work_end_time",
DROP COLUMN "work_start_time",
ADD COLUMN     "dispatch_time" TEXT NOT NULL DEFAULT '09:00';
