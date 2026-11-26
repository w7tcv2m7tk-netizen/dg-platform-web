CREATE TABLE "provider_usage" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "month" TEXT NOT NULL,
  "used" INTEGER NOT NULL DEFAULT 0,
  "limit" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "provider_usage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "provider_usage_provider_scope_month_key" ON "provider_usage"("provider", "scope", "month");
