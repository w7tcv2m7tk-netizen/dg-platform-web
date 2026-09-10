import assert from "node:assert/strict";
import { describe, it } from "node:test";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEvaluate() {
  return import(
    pathToFileURL(
      path.join(__dirname, "../packages/platform-core/src/access/evaluate.ts"),
    ).href
  );
}

describe("feature tail authority mapping", () => {
  it("maps communications email send to create authority", async () => {
    const { featureIdToPermissionCheck } = await loadEvaluate();
    assert.deepEqual(featureIdToPermissionCheck("communications.email.send"), {
      module: "communications",
      action: "create",
      scope: "assigned",
      subModule: "email",
    });
  });

  it("maps CRM contact import to create authority", async () => {
    const { featureIdToPermissionCheck } = await loadEvaluate();
    assert.deepEqual(featureIdToPermissionCheck("crm.contacts.import"), {
      module: "crm",
      action: "create",
      scope: "assigned",
      subModule: "contacts",
    });
  });

  it("maps communications agent configure to manage authority", async () => {
    const { featureIdToPermissionCheck } = await loadEvaluate();
    assert.deepEqual(featureIdToPermissionCheck("comms.agents.configure"), {
      module: "communications",
      action: "manage",
      scope: "assigned",
      subModule: "agents",
    });
  });

  it("does not let organisation-view-only member grants satisfy mutating tails", async () => {
    const { buildAccessContext, featureIdToPermissionCheck, hasPermission } =
      await loadEvaluate();

    const ctx = buildAccessContext({
      role: "member",
      organisationId: "org_test",
      enabledAppIds: [],
      grants: [
        { module: "communications", action: "view", scope: "organisation" },
        { module: "crm", action: "view", scope: "organisation" },
      ],
    });

    for (const featureId of [
      "communications.email.send",
      "crm.contacts.import",
      "comms.agents.configure",
    ]) {
      const check = featureIdToPermissionCheck(featureId);
      assert.ok(check);
      assert.equal(hasPermission(ctx, check), false, featureId);
    }
  });
});
