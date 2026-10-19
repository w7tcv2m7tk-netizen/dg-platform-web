-- Shared fail-closed operational hold for platform subscription webhook
-- lifecycle events during the legacy-entitlement cutover.
ALTER TABLE "platform_checkout_creation_gate"
  ADD COLUMN "subscription_webhooks_held" BOOLEAN NOT NULL DEFAULT FALSE;
