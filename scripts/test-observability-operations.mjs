import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const diagnostics = fs.readFileSync(
  "src/app/(shell)/command/platform-health/diagnostics/page.tsx",
  "utf8",
);
const webhookHealth = fs.readFileSync(
  "packages/platform-core/src/billing/webhook-observability.ts",
  "utf8",
);
const platformAlerts = fs.readFileSync(
  "packages/platform-core/src/command-centre/platform-alerts.ts",
  "utf8",
);
const platformIndex = fs.readFileSync("packages/platform-core/src/index.ts", "utf8");

test("System Diagnostics is live rather than a planned-feature placeholder", () => {
  assert.doesNotMatch(diagnostics, /Planned diagnostics/i);
  assert.doesNotMatch(
    diagnostics,
    /API health, error rates, webhook logs, background jobs, queue health, deployment status/i,
  );
  assert.match(diagnostics, /getOperatorPlatformAlertsCentre/);
  assert.match(diagnostics, /OperatorDataUnavailable/);
});

test("Diagnostics renders only telemetry the platform can currently prove", () => {
  for (const signal of [
    "infrastructureServices",
    "commercial",
    "connectors",
    "operationalLoad",
    "critical",
    "attention",
    "notices",
  ]) {
    assert.match(diagnostics, new RegExp(`data\\.${signal}`));
  }
  assert.match(diagnostics, /data\?\.diagnostics/);
  assert.doesNotMatch(diagnostics, /queue health|deployment status|background jobs/i);
});

test("Platform Alerts keeps real production service health checks", () => {
  assert.match(platformAlerts, /getDigitalInfrastructureOverview/);
  assert.match(platformAlerts, /buildInfrastructureServices/);
  assert.match(platformAlerts, /Production API/);
  assert.match(platformAlerts, /buildCommercialInfrastructure/);
  assert.match(platformAlerts, /buildOperationalLoad/);
});

test("Stripe webhook diagnostics use durable receipt lifecycle state", () => {
  assert.match(webhookHealth, /prisma\.stripeWebhookReceipt\.count/);
  assert.match(webhookHealth, /status:\s*"processed"/);
  assert.match(webhookHealth, /status:\s*"processing"/);
  assert.match(webhookHealth, /status:\s*"failed"/);
  assert.match(webhookHealth, /STALE_CLAIM_MS/);
  assert.match(webhookHealth, /MAX_ATTEMPTS/);
  assert.match(diagnostics, /getStripeWebhookProcessingHealth/);
  assert.match(diagnostics, /Processed · 24h/);
  assert.match(diagnostics, /Stale claims/);
  assert.match(diagnostics, /Retries exhausted/);
});

test("Webhook observability returns lifecycle metadata only", () => {
  const selectBlock = webhookHealth.match(/select:\s*\{([\s\S]*?)\n\s*\},\n\s*\}\),/)?.[1] ?? "";
  assert.match(selectBlock, /eventType:\s*true/);
  assert.match(selectBlock, /attempts:\s*true/);
  assert.match(selectBlock, /claimedAt:\s*true/);
  assert.doesNotMatch(selectBlock, /lastError|payload|body|customer/i);
  assert.doesNotMatch(diagnostics, /lastError/);
});

test("Webhook observability is exported through Platform Core", () => {
  assert.match(platformIndex, /export \* from "\.\/billing\/webhook-observability"/);
});

test("Diagnostics operator actions meet the native touch-target floor", () => {
  assert.match(diagnostics, /min-h-11/);
});
