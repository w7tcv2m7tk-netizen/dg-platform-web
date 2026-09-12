import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const overview = read("src/app/(shell)/apps/services/page.tsx");
const jobsPage = read("src/app/(shell)/apps/services/jobs/page.tsx");
const jobDetail = read("src/app/(shell)/apps/services/jobs/[id]/page.tsx");
const scheduling = read("src/app/(shell)/apps/services/scheduling/page.tsx");
const jobsRoute = read("src/app/api/v1/services/jobs/route.ts");
const jobRoute = read("src/app/api/v1/services/jobs/[id]/route.ts");
const templatesRoute = read("src/app/api/v1/services/templates/route.ts");
const activitiesRoute = read("src/app/api/v1/activities/route.ts");
const access = read("src/lib/services-page-access.ts");
const dates = read("src/lib/services-dates.ts");
const createForm = read("src/components/services/CreateServiceJobForm.tsx");
const editForm = read("src/components/services/EditServiceJobForm.tsx");
const scheduleForm = read("src/components/services/ScheduleJobQuickForm.tsx");
const stageForm = read("src/components/services/UpdateJobStageForm.tsx");
const checklist = read("src/components/services/JobChecklistPhotosPanel.tsx");
const noteForm = read("src/components/services/AddServiceJobNoteForm.tsx");
const templateForm = read("src/components/services/ApplyServiceTemplateForm.tsx");

test("Services job writes require organisation-scope Industry edit authority", () => {
  for (const source of [jobsRoute, jobRoute]) {
    assert.match(source, /requirePermission/);
    assert.match(source, /module: "industry"/);
    assert.match(source, /action: "edit"/);
    assert.match(source, /scope: "organisation"/);
    assert.match(source, /subModule: "services"/);
  }
});

test("Services template changes require organisation-scope management authority", () => {
  assert.match(templatesRoute, /requirePermission/);
  assert.match(templatesRoute, /action: "manage"/);
  assert.match(templatesRoute, /scope: "organisation"/);
  assert.match(templatesRoute, /subModule: "services"/);
});

test("ServiceJob timeline writes use the same organisation-wide authority", () => {
  assert.match(activitiesRoute, /entityType === "ServiceJob"/);
  assert.match(activitiesRoute, /requirePermission/);
  assert.match(activitiesRoute, /subModule: "services"/);
  assert.match(activitiesRoute, /scope: "organisation"/);
});

test("Services pages render mutation controls from the locked permission model", () => {
  assert.match(access, /buildAccessContext/);
  assert.match(access, /canManageServices/);
  assert.match(access, /canConfigureServices/);
  assert.match(access, /scope: "organisation"/);
  assert.match(overview, /canManageServices\(session\)/);
  assert.match(overview, /canConfigureServices\(session\)/);
  assert.match(jobsPage, /canManageServices\(session\)/);
  assert.match(jobDetail, /canManageServices\(session\)/);
  assert.match(scheduling, /canManageServices\(session\)/);
  assert.match(jobsPage, /Read-only access/);
  assert.match(jobDetail, /Read-only job/);
  assert.match(scheduling, /Read-only schedule/);
});

test("Services create, edit and quick scheduling use organisation timezone conversion", () => {
  assert.match(dates, /export function zonedDateTimeInput/);
  assert.match(dates, /export function zonedDateTimeLocalToUtc/);
  assert.match(createForm, /zonedDateTimeLocalToUtc\(startRaw, timeZone\)/);
  assert.match(editForm, /zonedDateTimeLocalToUtc\(startRaw, timeZone\)/);
  assert.match(editForm, /zonedDateTimeInput\(job\.scheduledStartAt, timeZone\)/);
  assert.match(scheduleForm, /zonedLocalToUtc\(day, `\$\{time\}:00`, timeZone\)/);
  assert.match(jobsPage, /timeZone=\{timeZone\}/);
  assert.match(jobDetail, /timeZone=\{timeZone\}/);
  assert.match(scheduling, /timeZone=\{timeZone\}/);
  assert.doesNotMatch(createForm, /new Date\(startRaw\)/);
  assert.doesNotMatch(editForm, /new Date\(startRaw\)/);
  assert.doesNotMatch(scheduleForm, /new Date\(startLocal\)/);
});

test("Services customer controls meet the native touch-target floor", () => {
  for (const source of [createForm, editForm, scheduleForm, stageForm, checklist, noteForm, templateForm]) {
    assert.match(source, /min-h-11/);
  }
});

test("Services customer UI does not advertise unfinished checklist/photo/template work", () => {
  assert.doesNotMatch(checklist, /can come later/i);
  assert.doesNotMatch(templateForm, /for the pilot/i);
  assert.match(checklist, /approved file or storage source/);
  assert.match(templateForm, /configure Services for this workspace/);
});
