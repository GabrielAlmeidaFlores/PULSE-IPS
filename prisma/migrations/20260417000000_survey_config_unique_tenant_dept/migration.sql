-- AddUniqueConstraint: only one survey configuration per department per tenant
CREATE UNIQUE INDEX "survey_configurations_tenant_id_department_id_key"
  ON "survey_configurations"("tenant_id", "department_id");
