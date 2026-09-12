/**
 * Founding 10 “who acts next” copy for Agreement sent.
 * Run: node --experimental-strip-types --test scripts/test-founding-next-action.mjs
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  FOUNDING_STAGE_WAITING_ON,
  FOUNDING_WAITING_ON_LABEL,
  describeFoundingProgress,
} from "../packages/platform-core/src/founding/pipeline.ts";

describe("agreement_sent waiting-on", () => {
  it("is waiting on the customer, not Ben", () => {
    assert.equal(FOUNDING_STAGE_WAITING_ON.agreement_sent, "customer");
    assert.equal(FOUNDING_WAITING_ON_LABEL.customer, "Waiting on them");
    assert.equal(FOUNDING_STAGE_WAITING_ON.accepted, "operator");
    assert.equal(FOUNDING_WAITING_ON_LABEL.operator, "Your move");
  });

  it("says they have not signed or started onboarding", () => {
    const copy = describeFoundingProgress("agreement_sent", {
      agreementEmailSentAt: "2026-09-01T00:00:00.000Z",
      hasOpenedPlatform: false,
    });
    assert.match(copy, /have not signed in/i);
    assert.match(copy, /onboarding/i);
    assert.match(copy, /Follow them up/);
  });

  it("says they signed in but have not confirmed terms", () => {
    const copy = describeFoundingProgress("agreement_sent", {
      agreementEmailSentAt: "2026-09-01T00:00:00.000Z",
      hasOpenedPlatform: true,
    });
    assert.match(copy, /signed in/i);
    assert.match(copy, /have not confirmed the terms/i);
  });
});
