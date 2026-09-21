import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboardPath = "src/app/(shell)/dashboard/page.tsx";

test("Business Overview always renders the Aida-led dashboard for signed-in organisations", async () => {
  const source = await readFile(dashboardPath, "utf8");

  assert.match(source, /<BusinessOverviewDashboard/);
  assert.doesNotMatch(source, /FoundingOperatorHome/);
  assert.doesNotMatch(source, /isFoundingCustomerMode/);
  assert.doesNotMatch(source, /foundingCustomerMode/);
});
