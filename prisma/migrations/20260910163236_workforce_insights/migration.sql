-- CreateTable
CREATE TABLE "workforce_insights" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "department_name" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workforce_insights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workforce_insights_tenant_id_competencia_idx" ON "workforce_insights"("tenant_id", "competencia");

-- AddForeignKey
ALTER TABLE "workforce_insights" ADD CONSTRAINT "workforce_insights_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
