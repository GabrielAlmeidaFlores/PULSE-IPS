-- AlterTable
ALTER TABLE "health_survey_configurations" ADD COLUMN "token_expiry_hours" INTEGER NOT NULL DEFAULT 48;
