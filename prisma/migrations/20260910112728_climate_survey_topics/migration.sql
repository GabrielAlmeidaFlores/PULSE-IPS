-- CreateTable
CREATE TABLE "climate_survey_topics" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "key" VARCHAR(60) NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "climate_survey_topics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "climate_survey_topics_tenant_id_idx" ON "climate_survey_topics"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "climate_survey_topics_tenant_id_key_key" ON "climate_survey_topics"("tenant_id", "key");

-- AddForeignKey
ALTER TABLE "climate_survey_topics" ADD CONSTRAINT "climate_survey_topics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
