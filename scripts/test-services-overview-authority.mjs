import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const overview = fs.readFileSync("src/app/(shell)/apps/services/page.tsx", "utf8");
const scheduling = fs.readFileSync(
  "src/app/(shell)/apps/services/scheduling/page.tsx",
  "utf8",
);
const overviewApi = fs.readFileSync(
  "src/app/api/v1/services/overview/route.ts",
  "utf8",
);
const templatesApi = fs.readFileSync(
  "src/app/api/v1/services/templates/route.ts",
  "utf8",
);

function pageBody(source) {
  const start = source.indexOf("export default async function");
  assert.ok(start >= 0);
  return source.slice(start);
}

test("services overview requires jobs.read before loading tenant data", () => {
  const body = pageBody(overview);
  assert.match(body, /getAuthorisedPlatformPageSession\("services\.jobs\.read"\)/);
  assert.ok(
    body.indexOf('getAuthorisedPlatformPageSession("services.jobs.read")') <
      body.indexOf("getServicesOverview("),
  );
  assert.doesNotMatch(overview, /resolveActivePlatformSession/);
  assert.match(overviewApi, /requireFeature\(session, "services\.jobs\.read"\)/);
});

test("services overview does not leak commerce quote counts without commerce.read", () => {
  assert.match(overview, /sessionHasFeature\(session, "commerce\.read"\)/);
  assert.match(overview, /canReadCommerce \? \(/);
  assert.match(overview, />Unavailable</);
});

test("template apply stays behind services.jobs.write like the API", () => {
  assert.match(overview, /sessionHasFeature\(session, "services\.jobs\.write"\)/);
  assert.match(overview, /canWriteJobs \? \(/);
  assert.match(overview, /ApplyServiceTemplateForm/);
  assert.match(templatesApi, /requireFeature\(session, "services\.jobs\.write"\)/);
});

test("scheduling requires jobs.read and hides mutations without write", () => {
  const body = pageBody(scheduling);
  assert.match(body, /getAuthorisedPlatformPageSession\("services\.jobs\.read"\)/);
  assert.ok(
    body.indexOf('getAuthorisedPlatformPageSession("services.jobs.read")') <
      body.indexOf("listServiceJobs("),
  );
  assert.doesNotMatch(scheduling, /resolveActivePlatformSession/);
  assert.match(scheduling, /sessionHasFeature\(session, "services\.jobs\.write"\)/);
  assert.match(scheduling, /canWriteJobs \? \(/);
  assert.match(scheduling, /ScheduleJobQuickForm/);
});
