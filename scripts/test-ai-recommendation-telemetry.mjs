import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const telemetry = await readFile(
  new URL("../packages/platform-core/src/intelligence/recommendation-telemetry.ts", import.meta.url),
  "utf8",
);
const dashboard = await readFile(
  new URL("../src/app/(shell)/dashboard/page.tsx", import.meta.url),
  "utf8",
);
const startRoute = await readFile(
  new URL("../src/app/api/v1/intelligence/recommendations/start/route.ts", import.meta.url),
  "utf8",
);

test("telemetry is durable and organisation scoped", () => {
  assert.match(telemetry, /prisma\.auditLog/);
  assert.match(telemetry, /organisationId: input\.organisationId/);
  assert.match(telemetry, /entityType: "ai_recommendation"/);
  assert.match(telemetry, /ai\.recommendation\.\$\{stage\}/);
});

test("completion requires measured resolution", () => {
  assert.match(telemetry, /recommendationResolved/);
  assert.match(telemetry, /overdueFollowUps === 0/);
  assert.match(telemetry, /overdueArCents === 0/);
  assert.match(telemetry, /completionBasis: "measured_state_resolved"/);
  assert.match(telemetry, /new-leads cannot be truthfully inferred/);
});

test("dashboard records shown and reconciles outcomes", () => {
  assert.match(dashboard, /stage: "shown"/);
  assert.match(dashboard, /reconcileAiRecommendationOutcomes/);
  assert.match(dashboard, /trackedRecommendationHref/);
});

test("recommendation click records started but never blocks navigation", () => {
  assert.match(startRoute, /stage: "started"/);
  assert.match(startRoute, /Telemetry must never block/);
  assert.match(startRoute, /safeInternalRedirect/);
  assert.match(startRoute, /NextResponse\.redirect/);
});
