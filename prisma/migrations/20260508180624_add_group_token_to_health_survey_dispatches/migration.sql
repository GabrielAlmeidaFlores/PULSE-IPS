/*
  Warnings:

  - A unique constraint covering the columns `[group_token]` on the table `health_survey_dispatches` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "health_survey_dispatches" ADD COLUMN     "group_token" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "health_survey_dispatches_group_token_key" ON "health_survey_dispatches"("group_token");
