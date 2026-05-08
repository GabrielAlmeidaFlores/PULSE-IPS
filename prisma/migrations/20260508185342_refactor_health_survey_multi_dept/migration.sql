-- DropIndex
DROP INDEX "health_survey_configurations_tenant_id_department_id_idx";

-- DropIndex
DROP INDEX "health_survey_dispatches_group_token_key";

-- CreateTable
CREATE TABLE "health_survey_config_departments" (
    "config_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,

    CONSTRAINT "health_survey_config_departments_pkey" PRIMARY KEY ("config_id","department_id")
);

-- CreateTable
CREATE TABLE "health_survey_dept_dispatches" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "dispatch_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "total_recipients" INTEGER NOT NULL DEFAULT 0,
    "total_responses" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_survey_dept_dispatches_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey (before backfill so constraints are set)
ALTER TABLE "health_survey_config_departments" ADD CONSTRAINT "health_survey_config_departments_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "health_survey_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "health_survey_config_departments" ADD CONSTRAINT "health_survey_config_departments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "health_survey_dept_dispatches" ADD CONSTRAINT "health_survey_dept_dispatches_dispatch_id_fkey" FOREIGN KEY ("dispatch_id") REFERENCES "health_survey_dispatches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "health_survey_dept_dispatches" ADD CONSTRAINT "health_survey_dept_dispatches_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: copy existing department_id into config_departments join table
INSERT INTO "health_survey_config_departments" ("config_id", "department_id")
SELECT "id", "department_id"
FROM "health_survey_configurations";

-- Backfill: create dept_dispatch rows from existing dispatches
INSERT INTO "health_survey_dept_dispatches" ("dispatch_id", "department_id", "total_recipients", "total_responses", "created_at", "updated_at")
SELECT
    d."id",
    c."department_id",
    d."total_recipients",
    d."total_responses",
    d."created_at",
    NOW()
FROM "health_survey_dispatches" d
JOIN "health_survey_configurations" c ON c."id" = d."health_survey_configuration_id";

-- CreateIndex unique constraint for dept_dispatches
CREATE UNIQUE INDEX "health_survey_dept_dispatches_dispatch_id_department_id_key" ON "health_survey_dept_dispatches"("dispatch_id", "department_id");

-- AlterTable: add department_id to responses
ALTER TABLE "health_survey_responses" ADD COLUMN "department_id" TEXT;

-- Backfill: set department_id on responses from dispatch config
UPDATE "health_survey_responses" r
SET "department_id" = c."department_id"
FROM "health_survey_dispatches" d
JOIN "health_survey_configurations" c ON c."id" = d."health_survey_configuration_id"
WHERE d."id" = r."dispatch_id";

-- AddForeignKey for responses.department_id
ALTER TABLE "health_survey_responses" ADD CONSTRAINT "health_survey_responses_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropForeignKey for old department_id on configurations
ALTER TABLE "health_survey_configurations" DROP CONSTRAINT "health_survey_configurations_department_id_fkey";

-- DropColumn: remove old columns (after backfill)
ALTER TABLE "health_survey_configurations" DROP COLUMN "department_id";
ALTER TABLE "health_survey_dispatches" DROP COLUMN "group_token";
ALTER TABLE "health_survey_dispatches" DROP COLUMN "total_recipients";
ALTER TABLE "health_survey_dispatches" DROP COLUMN "total_responses";
