import assert from "node:assert/strict";
import { describe, it } from "node:test";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import "./test-command-centre-concurrency.mjs";
import "./test-final-whole-platform-regression.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEvaluate() {
  return import(
    pathToFileURL(
      path.join(__dirname, "../packages/platform-core/src/access/evaluate.ts"),
    ).href
  );
}

describe("feature tail authority mapping", () => {
  it("maps communications email send to organisation-scoped create authority", async () => {
    const { featureIdToPermissionCheck } = await loadEvaluate();
    assert.deepEqual(featureIdToPermissionCheck("communications.email.send"), {
      module: "communications",
      action: "create",
      scope: "organisation",
      subModule: "email",
    });
  });

  it("maps CRM contact import to organisation-scoped create authority", async () => {
    const { featureIdToPermissionCheck } = await loadEvaluate();
    assert.deepEqual(featureIdToPermissionCheck("crm.contacts.import"), {
      module: "crm",
      action: "create",
      scope: "organisation",
      subModule: "contacts",
    });
  });

  it("maps communications agent configure to organisation-scoped manage authority", async () => {
    const { featureIdToPermissionCheck } = await loadEvaluate();
    assert.deepEqual(featureIdToPermissionCheck("comms.agents.configure"), {
      module: "communications",
      action: "manage",
      scope: "organisation",
      subModule: "agents",
    });
  });

  it("denies default Members while retaining Admin authority", async () => {
    const { buildAccessContext, featureIdToPermissionCheck, hasPermission } =
      await loadEvaluate();

    const member = buildAccessContext({
      role: "member",
      organisationId: "org_test",
      enabledAppIds: [],
    });
    const admin = buildAccessContext({
      role: "admin",
      organisationId: "org_test",
      enabledAppIds: [],
    });

    for (const featureId of [
      "communications.email.send",
      "crm.contacts.import",
      "comms.agents.configure",
    ]) {
      const check = featureIdToPermissionCheck(featureId);
      assert.ok(check);
      assert.equal(hasPermission(member, check), false, `member: ${featureId}`);
      assert.equal(hasPermission(admin, check), true, `admin: ${featureId}`);
    }
  });
});
