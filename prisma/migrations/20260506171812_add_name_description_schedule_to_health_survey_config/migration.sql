-- DropIndex
DROP INDEX "health_survey_configurations_tenant_id_department_id_key";

-- AlterTable
ALTER TABLE "health_survey_configurations" ADD COLUMN     "description" TEXT,
ADD COLUMN     "name" TEXT NOT NULL DEFAULT 'Pesquisa de Saúde',
ADD COLUMN     "scheduled_day_of_month" INTEGER;

-- CreateIndex
CREATE INDEX "health_survey_configurations_tenant_id_department_id_idx" ON "health_survey_configurations"("tenant_id", "department_id");
