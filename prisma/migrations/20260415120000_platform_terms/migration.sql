CREATE TABLE "platform_terms_versions" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "effective_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_terms_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_terms_acceptances" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "terms_version_id" TEXT NOT NULL,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_terms_acceptances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_terms_versions_version_key" ON "platform_terms_versions"("version");
CREATE UNIQUE INDEX "platform_terms_acceptances_user_id_terms_version_id_key" ON "platform_terms_acceptances"("user_id", "terms_version_id");
CREATE INDEX "platform_terms_acceptances_user_id_idx" ON "platform_terms_acceptances"("user_id");

ALTER TABLE "platform_terms_acceptances" ADD CONSTRAINT "platform_terms_acceptances_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "organization_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "platform_terms_acceptances" ADD CONSTRAINT "platform_terms_acceptances_terms_version_id_fkey"
    FOREIGN KEY ("terms_version_id") REFERENCES "platform_terms_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
