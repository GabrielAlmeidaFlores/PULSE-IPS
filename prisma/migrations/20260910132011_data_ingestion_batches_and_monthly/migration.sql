-- CreateTable
CREATE TABLE "data_import_batches" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" VARCHAR(500) NOT NULL,
    "file_type" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'received',
    "ai_provider" TEXT NOT NULL,
    "total_records" INTEGER NOT NULL DEFAULT 0,
    "corrected_records" INTEGER NOT NULL DEFAULT 0,
    "error_records" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_monthly" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "employee_name" TEXT NOT NULL,
    "document" TEXT,
    "registration" TEXT,
    "department_name" TEXT,
    "role_name" TEXT,
    "admission_date" TIMESTAMP(3),
    "termination_date" TIMESTAMP(3),
    "expected_hours" DOUBLE PRECISION,
    "worked_hours" DOUBLE PRECISION,
    "justified_absence_hours" DOUBLE PRECISION,
    "unjustified_absence_hours" DOUBLE PRECISION,
    "absence_rate_percent" DOUBLE PRECISION,
    "termination_type" TEXT,
    "quality_status" TEXT NOT NULL DEFAULT 'pending',
    "validation_notes" TEXT,
    "row_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_monthly_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "data_import_batches_tenant_id_idx" ON "data_import_batches"("tenant_id");

-- CreateIndex
CREATE INDEX "data_import_batches_tenant_id_status_idx" ON "data_import_batches"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "employee_monthly_tenant_id_idx" ON "employee_monthly"("tenant_id");

-- CreateIndex
CREATE INDEX "employee_monthly_tenant_id_competencia_idx" ON "employee_monthly"("tenant_id", "competencia");

-- CreateIndex
CREATE INDEX "employee_monthly_tenant_id_batch_id_idx" ON "employee_monthly"("tenant_id", "batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "employee_monthly_tenant_id_batch_id_row_hash_key" ON "employee_monthly"("tenant_id", "batch_id", "row_hash");

-- AddForeignKey
ALTER TABLE "data_import_batches" ADD CONSTRAINT "data_import_batches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_import_batches" ADD CONSTRAINT "data_import_batches_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "organization_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_monthly" ADD CONSTRAINT "employee_monthly_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_monthly" ADD CONSTRAINT "employee_monthly_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "data_import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
