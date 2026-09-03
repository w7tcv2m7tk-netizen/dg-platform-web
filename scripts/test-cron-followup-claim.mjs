import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { runClaimedLeadFollowup } from "../packages/platform-core/src/automation/followup-claim.ts";

function createMemoryOps({ now = () => Date.now(), leaseMs = 15 * 60 * 1000 } = {}) {
  const state = new Map();
  let tokenNumber = 0;

  function key(spec) {
    return `${spec.organisationId}:${spec.leadId}:${spec.sequenceKey}:${spec.sentKey}`;
  }

  return {
    state,
    ops: {
      async claim(spec) {
        const k = key(spec);
        const current = state.get(k);
        if (current?.sent) return null;
        if (current?.token && now() - current.claimedAt < leaseMs) return null;
        const token = `token-${++tokenNumber}`;
        state.set(k, { sent: false, token, claimedAt: now() });
        return { ...spec, token };
      },
      async complete(claim) {
        const k = key(claim);
        const current = state.get(k);
        if (!current || current.token !== claim.token) return false;
        state.set(k, { sent: true, token: null, claimedAt: null });
        return true;
      },
      async release(claim) {
        const k = key(claim);
        const current = state.get(k);
        if (!current || current.token !== claim.token) return false;
        state.set(k, { sent: false, token: null, claimedAt: null });
        return true;
      },
    },
  };
}

const baseSpec = {
  organisationId: "org-a",
  leadId: "lead-1",
  sequenceKey: "consultation_sequence",
  sentKey: "reminder_24h_sent",
};

test("two concurrent workers produce exactly one delivery", async () => {
  const { ops } = createMemoryOps();
  let deliveries = 0;
  let unblock;
  const gate = new Promise((resolve) => {
    unblock = resolve;
  });

  const deliver = async () => {
    deliveries += 1;
    await gate;
    return { status: "sent" };
  };

  const first = runClaimedLeadFollowup({
    spec: baseSpec,
    deliver,
    delivered: (result) => result.status === "sent",
    ops,
  });
  const second = runClaimedLeadFollowup({
    spec: baseSpec,
    deliver,
    delivered: (result) => result.status === "sent",
    ops,
  });

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(deliveries, 1);
  unblock();

  const results = await Promise.all([first, second]);
  assert.equal(results.filter((result) => result.status === "delivered").length, 1);
  assert.equal(results.filter((result) => result.status === "not_claimed").length, 1);
  assert.equal(deliveries, 1);
});

test("failed delivery releases the claim for an immediate retry", async () => {
  const { ops } = createMemoryOps();
  let attempts = 0;

  const failed = await runClaimedLeadFollowup({
    spec: baseSpec,
    deliver: async () => {
      attempts += 1;
      return { status: "failed" };
    },
    delivered: (result) => result.status === "sent",
    ops,
  });
  assert.equal(failed.status, "delivery_failed");

  const retried = await runClaimedLeadFollowup({
    spec: baseSpec,
    deliver: async () => {
      attempts += 1;
      return { status: "sent" };
    },
    delivered: (result) => result.status === "sent",
    ops,
  });
  assert.equal(retried.status, "delivered");
  assert.equal(attempts, 2);
});

test("a thrown delivery releases the claim for retry", async () => {
  const { ops } = createMemoryOps();

  const failed = await runClaimedLeadFollowup({
    spec: baseSpec,
    deliver: async () => {
      throw new Error("provider unavailable");
    },
    delivered: () => true,
    ops,
  });
  assert.equal(failed.status, "delivery_failed");

  const retried = await runClaimedLeadFollowup({
    spec: baseSpec,
    deliver: async () => ({ status: "sent" }),
    delivered: (result) => result.status === "sent",
    ops,
  });
  assert.equal(retried.status, "delivered");
});

test("already-completed follow-up is never delivered again", async () => {
  const { ops } = createMemoryOps();
  let deliveries = 0;

  const first = await runClaimedLeadFollowup({
    spec: baseSpec,
    deliver: async () => {
      deliveries += 1;
      return { status: "sent" };
    },
    delivered: (result) => result.status === "sent",
    ops,
  });
  const second = await runClaimedLeadFollowup({
    spec: baseSpec,
    deliver: async () => {
      deliveries += 1;
      return { status: "sent" };
    },
    delivered: (result) => result.status === "sent",
    ops,
  });

  assert.equal(first.status, "delivered");
  assert.equal(second.status, "not_claimed");
  assert.equal(deliveries, 1);
});

test("stale claim can be recovered", async () => {
  let clock = 1_000_000;
  const { ops } = createMemoryOps({ now: () => clock, leaseMs: 1000 });
  const held = await ops.claim(baseSpec);
  assert.ok(held);

  clock += 999;
  assert.equal(await ops.claim(baseSpec), null);

  clock += 2;
  const recovered = await ops.claim(baseSpec);
  assert.ok(recovered);
  assert.notEqual(recovered.token, held.token);
});

test("claim scope includes organisation so tenants do not block each other", async () => {
  const { ops } = createMemoryOps();
  const a = await ops.claim(baseSpec);
  const b = await ops.claim({ ...baseSpec, organisationId: "org-b" });
  assert.ok(a);
  assert.ok(b);
});

test("successful delivery with failed finalisation keeps the claim held", async () => {
  const memory = createMemoryOps();
  let releaseCalls = 0;
  const ops = {
    ...memory.ops,
    complete: async () => false,
    release: async (claim) => {
      releaseCalls += 1;
      return memory.ops.release(claim);
    },
  };

  const result = await runClaimedLeadFollowup({
    spec: baseSpec,
    deliver: async () => ({ status: "sent" }),
    delivered: (delivery) => delivery.status === "sent",
    ops,
  });

  assert.equal(result.status, "finalize_failed");
  assert.equal(releaseCalls, 0);
  assert.equal(await memory.ops.claim(baseSpec), null);
});

test("database claim SQL is tenant-scoped, conditional, token-owned and lease-aware", async () => {
  const source = await readFile(
    new URL("../packages/platform-core/src/automation/followup-claim.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /"organisation_id"\s*=\s*\$\{spec\.organisationId\}/);
  assert.match(source, /COALESCE\([\s\S]*sentKey[\s\S]*false[\s\S]*\)\s*=\s*false/);
  assert.match(source, /staleBefore/);
  assert.match(source, /claim\.token/);
  assert.match(source, /#- ARRAY\[\$\{claim\.sequenceKey\}, \$\{tokenKey\}\]/);
});

test("both cron send paths use claimed follow-up orchestration", async () => {
  const consultation = await readFile(
    new URL(
      "../packages/platform-core/src/marketing/consultation-automation.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const propertyReport = await readFile(
    new URL(
      "../packages/platform-core/src/real-estate/public-property-report.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(consultation, /runClaimedLeadFollowup/);
  assert.match(consultation, /sequenceKey:\s*"consultation_sequence"/);
  assert.match(propertyReport, /runClaimedLeadFollowup/);
  assert.match(propertyReport, /sequenceKey:\s*"property_report_sequence"/);
});
