import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.join(
  __dirname,
  "../packages/platform-core/src/command-centre/operator-services.ts",
);

function createSerialQueue() {
  let tail = Promise.resolve();
  return async function queue(work) {
    const previous = tail;
    let release;
    tail = new Promise((resolve) => {
      release = resolve;
    });
    await previous.catch(() => undefined);
    try {
      return await work();
    } finally {
      release();
    }
  };
}

test("Command Centre heavy reads retain the bounded serial queue contract", async () => {
  const source = await readFile(sourcePath, "utf8");

  assert.match(source, /let commandCentreReadTail: Promise<void> = Promise\.resolve\(\)/);
  assert.match(source, /const previous = commandCentreReadTail/);
  assert.match(source, /commandCentreReadTail = new Promise<void>/);
  assert.match(source, /await previous\.catch\(\(\) => undefined\)/);
  assert.match(source, /finally \{\s*release\(\);\s*\}/);

  for (const wrapper of [
    "getOperatorCommandCentreOpsHome",
    "getOperatorClientIntelligence",
    "getOperatorGrowthReports",
    "getOperatorClientExpansionOpportunities",
    "getOperatorGrowthFollowUpQueue",
    "getOperatorGrowthConversionSnapshot",
    "listOperatorPlatformOpportunities",
    "getOperatorPlatformAlertsCentre",
    "getOperatorCommandMrrAttribution",
    "getOperatorDeliveryDashboard",
    "getOperatorDeliverySectionWorkspace",
  ]) {
    const start = source.indexOf(`export async function ${wrapper}`);
    assert.ok(start >= 0, `${wrapper} must exist`);
    const next = source.indexOf("\nexport async function ", start + 1);
    const body = source.slice(start, next >= 0 ? next : undefined);
    assert.match(body, /queueCommandCentreRead\(/, `${wrapper} must use the serial queue`);
  }

  for (const wrapper of ["getOperatorDeliveryDashboard", "getOperatorDeliverySectionWorkspace"]) {
    const start = source.indexOf(`export async function ${wrapper}`);
    const next = source.indexOf("\nexport async function ", start + 1);
    const body = source.slice(start, next >= 0 ? next : undefined);
    assert.doesNotMatch(body, /Promise\.all\(/, `${wrapper} must not fan out DB reads internally`);
  }
});

test("serial queue survives a 100-job concurrent burst without overlapping work or deadlocking after failures", async () => {
  const queue = createSerialQueue();
  let active = 0;
  let maxActive = 0;
  const starts = [];

  const jobs = Array.from({ length: 100 }, (_, index) =>
    queue(async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      starts.push(index);
      await new Promise((resolve) => setTimeout(resolve, index % 4));
      active -= 1;
      if (index === 17 || index === 63) throw new Error(`synthetic-${index}`);
      return index;
    }),
  );

  const results = await Promise.allSettled(jobs);
  assert.equal(maxActive, 1, "queued work must never overlap");
  assert.deepEqual(starts, Array.from({ length: 100 }, (_, index) => index));
  assert.equal(results.filter((result) => result.status === "rejected").length, 2);
  assert.equal(results.at(-1)?.status, "fulfilled", "a failed job must not deadlock later work");
});
