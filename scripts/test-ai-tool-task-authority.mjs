import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { getAiTool } from "../packages/platform-core/src/ai/tools/registry.ts";
import { taskLinkPairError } from "../packages/platform-core/src/tasks/target.ts";

const executeRoute = fs.readFileSync(
  "src/app/api/v1/ai/tools/execute/route.ts",
  "utf8",
);
const executor = fs.readFileSync(
  "packages/platform-core/src/ai/tools/executor.ts",
  "utf8",
);
const registry = fs.readFileSync(
  "packages/platform-core/src/ai/tools/registry.ts",
  "utf8",
);
const targetLookup = fs.readFileSync(
  "packages/platform-core/src/tasks/target.ts",
  "utf8",
);
const targetAuthority = fs.readFileSync(
  "src/lib/task-target-authority.ts",
  "utf8",
);

const post = executeRoute.slice(executeRoute.indexOf("export async function POST"));
const followUp = executor.slice(
  executor.indexOf('if (tool.id === "crm.create_follow_up_task")'),
  executor.indexOf("} else {"),
);

test("AI follow-up tool requires crm.tasks.write and does not treat approval as authority", () => {
  const tool = getAiTool("crm.create_follow_up_task");
  assert.ok(tool);
  assert.deepEqual(tool.requiredFeatures, ["crm.tasks.write"]);
  assert.equal(tool.requiresApproval, true);
  assert.match(post, /assertEntitlement\(session\.organisationId, "useAi"\)/);
  assert.match(post, /for \(const featureId of tool\.requiredFeatures\)/);
  assert.match(post, /requireFeature\(session, featureId\)/);
  assert.ok(
    post.indexOf("requireFeature(session, featureId)") < post.indexOf("executeAiTool("),
    "Member without crm.tasks.write is rejected before executeAiTool",
  );
  assert.ok(
    post.indexOf("assertEntitlement") < post.indexOf("executeAiTool("),
    "AI entitlement remains intact before execution",
  );
  assert.match(executor, /tool.requiresApproval && input.confirmed !== true/);
});

test("allowed callers still reach executeAiTool after authority checks", () => {
  assert.match(post, /const result = await executeAiTool\(/);
  assert.ok(post.indexOf("validateTaskTarget") < post.indexOf("executeAiTool("));
});

test("entityType and entityId must be supplied together", () => {
  const missingId = taskLinkPairError("Contact", undefined);
  assert.equal(missingId?.code, "validation_error");
  const missingType = taskLinkPairError(undefined, "con_1");
  assert.equal(missingType?.code, "validation_error");
  assert.equal(taskLinkPairError(undefined, undefined), null);
  assert.equal(taskLinkPairError("Contact", "con_1"), null);
  assert.match(post, /taskLinkPairError\(entityType, entityId\)/);
  assert.ok(post.indexOf("taskLinkPairError") < post.indexOf("executeAiTool("));
  assert.match(followUp, /taskLinkPairError\(entityType, entityId\)/);
});

test("foreign and unsupported task targets fail before createTask", () => {
  assert.match(followUp, /await resolveTaskLinkTarget/);
  assert.ok(
    followUp.indexOf("resolveTaskLinkTarget") < followUp.indexOf("createTask("),
    "createTask is not reached when target validation fails",
  );
  assert.match(targetLookup, /getContact\(organisationId, entityId\)/);
  assert.match(targetLookup, /getCompany\(organisationId, entityId\)/);
  assert.match(targetLookup, /getOpportunity\(organisationId, entityId\)/);
  assert.match(targetLookup, /getServiceJob\(organisationId, entityId\)/);
  assert.match(targetLookup, /linked_contact_not_found/);
  assert.match(targetLookup, /linked_company_not_found/);
  assert.match(targetLookup, /linked_opportunity_not_found/);
  assert.match(targetLookup, /linked_job_not_found/);
  assert.match(targetLookup, /unsupported_entity_type/);
  assert.match(post, /requireTargetWrite: true/);
  assert.match(targetAuthority, /"crm.contacts.write"/);
  assert.match(targetAuthority, /"crm.companies.write"/);
  assert.match(targetAuthority, /"crm.opportunities.write"/);
  assert.match(targetAuthority, /"services.jobs.write"/);
});

test("same-org valid targets still execute after the org-scoped lookup", () => {
  assert.match(followUp, /if \(entityType && entityId\) \{/);
  assert.match(followUp, /entityType: input.params\?\.entityType/);
  assert.match(followUp, /entityId: input.params\?\.entityId/);
  assert.ok(followUp.indexOf("if (!target.ok)") < followUp.indexOf("createTask("));
  assert.match(followUp, /const task = await createTask\(/);
});

test("API-key sessions use the same requireFeature model as the Tasks API", () => {
  assert.match(post, /requirePlatformAuth\(req\)/);
  assert.doesNotMatch(post, /isApiKeySession/);
  assert.doesNotMatch(post, /api_key:/);
  assert.match(registry, /requiredFeatures: \["crm.tasks.write"\]/);
});
