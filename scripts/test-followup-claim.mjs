import assert from "node:assert/strict";
import { describe, it } from "node:test";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modulePath = pathToFileURL(
  path.join(__dirname, "../packages/platform-core/src/leads/followup-claim.ts"),
).href;

const load = () => import(modulePath);

function keyOf(input) {
  return `${input.organisationId}:${input.leadId}:${input.sequenceKey}:${input.sentFlag}`;
}

function memoryStore(seed = [], leaseMs = 15 * 60 * 1000) {
  const rows = new Map();
  for (const row of seed) rows.set(keyOf(row), { ...row });

  return {
    rows,
    async claim(input) {
      const key = keyOf(input);
      const row = rows.get(key) ?? { sent: false, claim: null };
      if (row.sent) return false;
      const staleBefore = new Date(input.claimedAt).getTime() - leaseMs;
      if (
        row.claim &&
        new Date(row.claim.claimedAt).getTime() > staleBefore
      ) {
        return false;
      }
      rows.set(key, {
        ...row,
        organisationId: input.organisationId,
        leadId: input.leadId,
        sequenceKey: input.sequenceKey,
        sentFlag: input.sentFlag,
        claim: { token: input.token, claimedAt: input.claimedAt },
      });
      return true;
    },
    async complete(input, sentAt) {
      const key = keyOf(input);
      const row = rows.get(key);
      if (!row || row.sent || row.claim?.token !== input.token) return false;
      row.sent = true;
      row.sentAt = sentAt;
      row.claim = null;
      return true;
    },
    async release(input) {
      const row = rows.get(keyOf(input));
      if (row && !row.sent && row.claim?.token === input.token) row.claim = null;
    },
  };
}

function claim(overrides = {}) {
  return {
    organisationId: "org_a",
    leadId: "lead_1",
    sequenceKey: "property_report_sequence",
    sentFlag: "email_2_sent",
    sentAtFlag: "email_2_sent_at",
    now: new Date("2026-09-03T06:00:00.000Z"),
    ...overrides,
  };
}

describe("cron follow-up atomic claim", () => {
  it("allows exactly one concurrent worker to send the same eligible follow-up", async () => {
    const { runClaimedFollowup } = await load();
    const store = memoryStore();
    let sends = 0;
    const send = async () => {
      sends += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { accepted: true, value: "ok" };
    };

    const results = await Promise.all([
      runClaimedFollowup({ store, claim: claim(), send }),
      runClaimedFollowup({ store, claim: claim(), send }),
    ]);

    assert.equal(sends, 1);
    assert.equal(results.filter((r) => r.status === "sent").length, 1);
    assert.equal(results.filter((r) => r.status === "not_claimed").length, 1);
  });

  it("releases a failed send so a later worker can retry", async () => {
    const { runClaimedFollowup } = await load();
    const store = memoryStore();
    let attempts = 0;

    const first = await runClaimedFollowup({
      store,
      claim: claim(),
      send: async () => {
        attempts += 1;
        return { accepted: false, value: "provider failed" };
      },
    });
    assert.equal(first.status, "failed");

    const second = await runClaimedFollowup({
      store,
      claim: claim({ now: new Date("2026-09-03T06:01:00.000Z") }),
      send: async () => {
        attempts += 1;
        return { accepted: true, value: "recovered" };
      },
    });

    assert.equal(second.status, "sent");
    assert.equal(attempts, 2);
  });

  it("never reacquires an already-sent follow-up", async () => {
    const { runClaimedFollowup } = await load();
    const base = claim();
    const store = memoryStore([{ ...base, sent: true, claim: null }]);
    let sends = 0;

    const result = await runClaimedFollowup({
      store,
      claim: base,
      send: async () => {
        sends += 1;
        return { accepted: true, value: "unexpected" };
      },
    });

    assert.equal(result.status, "not_claimed");
    assert.equal(sends, 0);
  });

  it("keeps claims isolated by organisation even for the same lead id and step", async () => {
    const { runClaimedFollowup } = await load();
    const store = memoryStore();
    const sentByOrg = [];

    const results = await Promise.all([
      runClaimedFollowup({
        store,
        claim: claim({ organisationId: "org_a" }),
        send: async () => {
          sentByOrg.push("org_a");
          return { accepted: true, value: "a" };
        },
      }),
      runClaimedFollowup({
        store,
        claim: claim({ organisationId: "org_b" }),
        send: async () => {
          sentByOrg.push("org_b");
          return { accepted: true, value: "b" };
        },
      }),
    ]);

    assert.deepEqual(results.map((r) => r.status).sort(), ["sent", "sent"]);
    assert.deepEqual(sentByOrg.sort(), ["org_a", "org_b"]);
  });

  it("recovers an abandoned claim only after the lease is stale", async () => {
    const { FOLLOWUP_CLAIM_LEASE_MS, runClaimedFollowup } = await load();
    const base = claim();
    const claimedAt = new Date(
      base.now.getTime() - FOLLOWUP_CLAIM_LEASE_MS - 1_000,
    ).toISOString();
    const store = memoryStore([
      {
        ...base,
        sent: false,
        claim: { token: "dead-worker", claimedAt },
      },
    ]);
    let sends = 0;

    const recovered = await runClaimedFollowup({
      store,
      claim: base,
      send: async () => {
        sends += 1;
        return { accepted: true, value: "recovered" };
      },
    });
    assert.equal(recovered.status, "sent");
    assert.equal(sends, 1);

    const recentStore = memoryStore([
      {
        ...base,
        leadId: "lead_2",
        sent: false,
        claim: {
          token: "live-worker",
          claimedAt: new Date(base.now.getTime() - 60_000).toISOString(),
        },
      },
    ]);
    const recent = await runClaimedFollowup({
      store: recentStore,
      claim: claim({ leadId: "lead_2" }),
      send: async () => ({ accepted: true, value: "unexpected" }),
    });
    assert.equal(recent.status, "not_claimed");
  });

  it("keeps the production claim as one conditional org-scoped UPDATE before send", async () => {
    const source = await readFile(
      path.join(
        __dirname,
        "../packages/platform-core/src/leads/followup-claim.ts",
      ),
      "utf8",
    );
    assert.match(source, /UPDATE "leads"/);
    assert.match(source, /"organisation_id" = \$\{input\.organisationId\}/);
    assert.match(source, /"id" = \$\{input\.leadId\}/);
    assert.match(source, /RETURNING "id"/);
    assert.match(source, /claimedAt/);
    assert.match(source, /FOLLOWUP_CLAIM_LEASE_MS/);
    assert.doesNotMatch(source, /DELETE FROM|TRUNCATE|ALTER TABLE/);
  });
});
