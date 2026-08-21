-- CreateIndex
CREATE INDEX "action_plans_created_at_idx" ON "action_plans"("created_at");

-- CreateIndex
CREATE INDEX "climate_survey_dispatches_climate_survey_configuration_id_idx" ON "climate_survey_dispatches"("climate_survey_configuration_id");

-- CreateIndex
CREATE INDEX "climate_survey_dispatches_created_at_idx" ON "climate_survey_dispatches"("created_at");

-- CreateIndex
CREATE INDEX "climate_survey_questions_dimension_idx" ON "climate_survey_questions"("dimension");

-- CreateIndex
CREATE INDEX "climate_survey_response_items_question_id_idx" ON "climate_survey_response_items"("question_id");

-- CreateIndex
CREATE INDEX "climate_survey_response_tokens_created_at_idx" ON "climate_survey_response_tokens"("created_at");

-- CreateIndex
CREATE INDEX "climate_survey_responses_created_at_idx" ON "climate_survey_responses"("created_at");

-- CreateIndex
CREATE INDEX "climate_survey_responses_tenant_id_created_at_idx" ON "climate_survey_responses"("tenant_id", "created_at");
