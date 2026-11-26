import assert from "node:assert/strict";
import { test } from "node:test";
import { applyCleanup, planCleanup, PROTECTED_BRANCH_NAMES } from "./neon-branch-cleanup.mjs";

const branch = (overrides = {}) => ({
  name: "preview/example", id: "br-example", decision: "SAFE",
  activeAlias: null, branchSpecificEnv: false, worktree: false,
  scheduledJob: false, children: [], dependencyChecked: true, evidencePreserved: true, protected: false,
  ...overrides,
});

test("protected Production/Development/Recovery branches are never selected", () => {
  const plan = planCleanup(PROTECTED_BRANCH_NAMES.map((name, i) => branch({ name, id: `br-${i}`, protected: true })));
  assert.ok(plan.every((item) => !item.safe));
  assert.ok(plan.every((item) => item.blockedBy.includes("protected")));
});

test("active aliases, branch env bindings, worktrees, jobs and children block cleanup", () => {
  const plan = planCleanup([
    branch({ activeAlias: "dg-preview.example" }),
    branch({ branchSpecificEnv: true }),
    branch({ worktree: true }),
    branch({ scheduledJob: true }),
    branch({ children: ["br-child"] }),
    branch({ dependencyChecked: false }),
    branch({ evidencePreserved: false }),
    branch({ activeDeployment: true }),
    branch({ deploymentInProgress: true }),
    branch({ decision: "HOLD" }),
  ]);
  assert.ok(plan.every((item) => !item.safe));
});

test("only a fully verified SAFE branch is selected and dry-run makes no network call", async () => {
  let calls = 0;
  const plan = planCleanup([branch(), branch({ name: "keep", id: "br-keep", decision: "KEEP" })]);
  assert.deepEqual(plan.map((item) => item.safe), [true, false]);
  const result = await applyCleanup(plan, { apply: false, fetchImpl: async () => { calls++; return new Response(null, { status: 204 }); } });
  assert.equal(result.dryRun, true);
  assert.equal(calls, 0);
  assert.equal(result.deleted.length, 0);
});

test("apply requires explicit confirmation and deletes only the safe branch", async () => {
  const calls = [];
  const plan = planCleanup([branch(), branch({ name: "hold", id: "br-hold", decision: "HOLD" })]);
  await assert.rejects(() => applyCleanup(plan, { apply: true, projectId: "misty-smoke-15171208", apiKey: "test", confirm: "wrong", fetchImpl: async () => new Response(null, { status: 204 }) }));
  const result = await applyCleanup(plan, { apply: true, projectId: "misty-smoke-15171208", apiKey: "test", confirm: "misty-smoke-15171208", fetchImpl: async (url, init) => { calls.push([url, init.method]); return new Response(null, { status: 204 }); } });
  assert.equal(result.deleted.length, 1);
  assert.equal(calls.length, 1);
  assert.match(calls[0][0], /branches\/br-example$/);
  assert.equal(calls[0][1], "DELETE");
});

test("API failure fails closed before any other deletion", async () => {
  let calls = 0;
  const plan = planCleanup([branch(), branch({ name: "second", id: "br-second" })]);
  await assert.rejects(() => applyCleanup(plan, {
    apply: true, projectId: "misty-smoke-15171208", apiKey: "test", confirm: "misty-smoke-15171208",
    fetchImpl: async () => { calls++; return new Response(null, { status: 500 }); },
  }));
  assert.equal(calls, 1);
});
test("concurrent deployment activity blocks selection", () => {
  const plan = planCleanup([branch({ deploymentInProgress: true }), branch({ activeDeployment: true })]);
  assert.ok(plan.every((item) => !item.safe));
});
