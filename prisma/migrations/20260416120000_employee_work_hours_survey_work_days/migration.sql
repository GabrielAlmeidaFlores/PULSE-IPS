-- AlterTable: Add optional work hours per employee
ALTER TABLE "employees" ADD COLUMN "work_start_time" TEXT;
ALTER TABLE "employees" ADD COLUMN "work_end_time" TEXT;

-- AlterTable: Add work_days to survey configurations
ALTER TABLE "survey_configurations" ADD COLUMN "work_days" TEXT NOT NULL DEFAULT '1,2,3,4,5';
