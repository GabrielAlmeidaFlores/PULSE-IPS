-- Rename columns: plans
ALTER TABLE "plans" RENAME COLUMN "stripe_product_id" TO "external_product_id";

-- Rename columns: plan_prices
DROP INDEX "plan_prices_stripe_price_id_key";
ALTER TABLE "plan_prices" RENAME COLUMN "stripe_price_id" TO "external_price_id";
CREATE UNIQUE INDEX "plan_prices_external_price_id_key" ON "plan_prices"("external_price_id");

-- Rename columns: organizations
DROP INDEX "organizations_stripe_customer_id_key";
ALTER TABLE "organizations" RENAME COLUMN "stripe_customer_id" TO "external_customer_id";
CREATE UNIQUE INDEX "organizations_external_customer_id_key" ON "organizations"("external_customer_id");

-- Rename columns: organization_subscriptions
DROP INDEX "organization_subscriptions_stripe_subscription_id_key";
ALTER TABLE "organization_subscriptions" RENAME COLUMN "stripe_subscription_id" TO "external_subscription_id";
ALTER TABLE "organization_subscriptions" RENAME COLUMN "snapshot_stripe_price_id" TO "snapshot_external_price_id";
CREATE UNIQUE INDEX "organization_subscriptions_external_subscription_id_key" ON "organization_subscriptions"("external_subscription_id");

-- Rename table: stripe_webhook_events -> billing_webhook_events
ALTER TABLE "stripe_webhook_events" DROP CONSTRAINT "stripe_webhook_events_tenant_id_fkey";
DROP INDEX "stripe_webhook_events_stripe_event_id_key";
ALTER TABLE "stripe_webhook_events" RENAME TO "billing_webhook_events";
ALTER INDEX "stripe_webhook_events_pkey" RENAME TO "billing_webhook_events_pkey";
ALTER TABLE "billing_webhook_events" RENAME COLUMN "stripe_event_id" TO "external_event_id";
CREATE UNIQUE INDEX "billing_webhook_events_external_event_id_key" ON "billing_webhook_events"("external_event_id");
ALTER TABLE "billing_webhook_events" ADD CONSTRAINT "billing_webhook_events_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
