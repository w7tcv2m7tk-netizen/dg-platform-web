/**
 * Cron duplicate-send prevention.
 *
 * Both cron families were select-then-send with the state update AFTER the
 * external send, so two concurrent invocations could select the same record and
 * both deliver it. Scheduled emails now use a conditional-update claim on
 * status; follow-ups claim one (lead, step) pair before sending.
 *
 * The claim semantics are modelled here against the same conditions the SQL
 * uses, so the concurrency contract is provable without a database.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const readSource = (rel) => readFile(path.join(__dirname, "..", rel), "utf8");
const loadCore = (rel) =>
  import(
    pathToFileURL(path.join(__dirname, "../packages/platform-core/src", rel)).href
  );

/**
 * Mirrors the scheduled-email claim: a conditional UPDATE that only matches a
 * row still `scheduled`, or `sending` with an expired claim.
 */
function scheduledEmailStore(rows, staleMs) {
  return {
    rows,
    claim(id, now = Date.now()) {
      const row = rows.get(id);
      if (!row) return 0;
      const eligible =
        row.status === "scheduled" ||
        (row.status === "sending" && now - row.updatedAt >= staleMs);
      if (!eligible) return 0;
      row.status = "sending";
      row.updatedAt = now;
      return 1;
    },
    complete(id) {
      const row = rows.get(id);
      if (row) row.status = "sent";
    },
  };
}

const STALE_MS = 15 * 60 * 1000;

describe("Scheduled emails: atomic claim", () => {
  it("only one of two concurrent workers can claim the same message", () => {
    const rows = new Map([
      ["msg_1", { status: "scheduled", updatedAt: Date.now() }],
    ]);
    const store = scheduledEmailStore(rows, STALE_MS);

    const first = store.claim("msg_1");
    const second = store.claim("msg_1");

    assert.equal(first, 1, "first worker wins");
    assert.equal(second, 0, "second worker must not send");
  });

  it("does not claim a message another worker is actively sending", () => {
    const rows = new Map([
      ["msg_2", { status: "sending", updatedAt: Date.now() - 60_000 }],
    ]);
    const store = scheduledEmailStore(rows, STALE_MS);

    assert.equal(store.claim("msg_2"), 0);
  });

  it("reclaims a message abandoned by a crashed worker", () => {
    const rows = new Map([
      ["msg_3", { status: "sending", updatedAt: Date.now() - STALE_MS - 60_000 }],
    ]);
    const store = scheduledEmailStore(rows, STALE_MS);

    assert.equal(store.claim("msg_3"), 1, "a stale claim must be recoverable");
  });

  it("never re-sends a completed message", () => {
    const rows = new Map([["msg_4", { status: "scheduled", updatedAt: Date.now() }]]);
    const store = scheduledEmailStore(rows, STALE_MS);

    assert.equal(store.claim("msg_4"), 1);
    store.complete("msg_4");
    assert.equal(store.claim("msg_4"), 0);
  });

  it("processes independent messages concurrently", () => {
    const now = Date.now();
    const rows = new Map([
      ["a", { status: "scheduled", updatedAt: now }],
      ["b", { status: "scheduled", updatedAt: now }],
    ]);
    const store = scheduledEmailStore(rows, STALE_MS);

    assert.equal(store.claim("a"), 1);
    assert.equal(store.claim("b"), 1, "different messages must not contend");
  });
});

describe("Scheduled emails: implementation shape", () => {
  it("claims before sending, not after", async () => {
    const src = await readSource(
      "packages/platform-core/src/core-communications/service.ts",
    );

    const claimAt = src.indexOf('data: { status: "sending" }');
    const sendAt = src.indexOf("await sendMessage({");
    assert.ok(claimAt > 0, "must claim the row");
    assert.ok(sendAt > 0);
    assert.ok(claimAt < sendAt, "the claim must precede the send");
  });

  it("selects abandoned sending rows so a crash is recoverable", async () => {
    const src = await readSource(
      "packages/platform-core/src/core-communications/service.ts",
    );
    assert.match(src, /STALE_SEND_CLAIM_MS/);
    assert.match(src, /status: "sending", updatedAt: \{ lt: staleBefore \}/);
  });
});

describe("Follow-up processors: per-lead step claim", () => {
  it("builds a claim key unique per sequence and step", async () => {
    const { followupClaimKey } = await loadCore("leads/followup-claim.ts");

    assert.equal(
      followupClaimKey("property_report", 2),
      "property_report_email_2_claimed_at",
    );
    // Different sequences must not collide on the same lead.
    assert.notEqual(
      followupClaimKey("free_audit", 2),
      followupClaimKey("property_report", 2),
    );
    // Different steps must not collide.
    assert.notEqual(
      followupClaimKey("property_report", 1),
      followupClaimKey("property_report", 2),
    );
  });

  it("fails closed without a database rather than sending unclaimed", async () => {
    const { claimLeadFollowupStep } = await loadCore("leads/followup-claim.ts");

    const saved = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      const owned = await claimLeadFollowupStep({
        leadId: "lead_1",
        organisationId: "org_1",
        sequenceKey: "property_report",
        step: 2,
        sentPath: ["property_report_sequence", "email_2_sent"],
      });
      assert.equal(owned, false, "no database means no claim, so no send");
    } finally {
      if (saved === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = saved;
    }
  });

  it("all four processors claim before sending", async () => {
    const processors = [
      "packages/platform-core/src/real-estate/public-property-report.ts",
      "packages/platform-core/src/marketing/public-business-audit.ts",
      "packages/platform-core/src/accommodation/public-hideaway-circle.ts",
      "packages/platform-core/src/marketing/consultation-automation.ts",
    ];

    for (const rel of processors) {
      const src = await readSource(rel);
      const claimAt = src.indexOf("claimLeadFollowupStep({");
      assert.ok(claimAt > 0, `${rel} must claim the step`);

      // The claim must appear before the send inside the due-step loop.
      const loopAt = src.indexOf("for (const step of due) {");
      const sendAt = src.indexOf("await sendMessage({", loopAt);
      assert.ok(loopAt > 0 && sendAt > 0, `${rel} loop/send not found`);
      assert.ok(
        loopAt < claimAt && claimAt < sendAt,
        `${rel} must claim inside the loop and before the send`,
      );
    }
  });

  it("does not serialise all follow-up processing behind one lock", async () => {
    const src = await readSource(
      "packages/platform-core/src/leads/followup-claim.ts",
    );
    // Claim is scoped to a single lead id + step, never a table- or job-wide lock.
    assert.match(src, /"id" = \$\{input\.leadId\}/);
    assert.doesNotMatch(src, /pg_advisory_lock\(/);
    assert.match(src, /STALE_FOLLOWUP_CLAIM_MS/);
  });

  it("refuses to claim a step that already completed", async () => {
    const src = await readSource(
      "packages/platform-core/src/leads/followup-claim.ts",
    );
    // The sent flag is part of the conditional UPDATE, so a completed step can
    // never be reclaimed even after the claim expires.
    assert.match(src, /sentPathLiteral/);
    assert.match(src, /= false/);
  });
});
