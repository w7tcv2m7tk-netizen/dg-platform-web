-- Server-controlled Industry App and premium-app purchase projection.
-- Empty defaults intentionally fail closed for legacy subscription rows until
-- they are refreshed from their verified Stripe subscription.
ALTER TABLE "platform_subscriptions"
  ADD COLUMN "industry_apps" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "premium_apps" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
