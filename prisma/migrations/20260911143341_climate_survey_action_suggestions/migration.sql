-- CreateTable
CREATE TABLE "climate_survey_action_suggestions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "dispatch_id" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "what" TEXT NOT NULL,
    "why" TEXT NOT NULL,
    "who" TEXT NOT NULL,
    "where" TEXT NOT NULL,
    "when" TEXT NOT NULL,
    "how" TEXT NOT NULL,
    "cost" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rejected_reason" TEXT,
    "action_plan_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "climate_survey_action_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "climate_survey_action_suggestions_action_plan_id_key" ON "climate_survey_action_suggestions"("action_plan_id");

-- CreateIndex
CREATE INDEX "climate_survey_action_suggestions_tenant_id_status_idx" ON "climate_survey_action_suggestions"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "climate_survey_action_suggestions_tenant_id_dispatch_id_idx" ON "climate_survey_action_suggestions"("tenant_id", "dispatch_id");

-- AddForeignKey
ALTER TABLE "climate_survey_action_suggestions" ADD CONSTRAINT "climate_survey_action_suggestions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "climate_survey_action_suggestions" ADD CONSTRAINT "climate_survey_action_suggestions_dispatch_id_fkey" FOREIGN KEY ("dispatch_id") REFERENCES "climate_survey_dispatches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "climate_survey_action_suggestions" ADD CONSTRAINT "climate_survey_action_suggestions_action_plan_id_fkey" FOREIGN KEY ("action_plan_id") REFERENCES "action_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
