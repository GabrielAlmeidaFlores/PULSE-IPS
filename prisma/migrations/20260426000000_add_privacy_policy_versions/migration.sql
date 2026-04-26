CREATE TABLE "privacy_policy_versions" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "effective_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "privacy_policy_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "privacy_policy_versions_version_key" ON "privacy_policy_versions"("version");
