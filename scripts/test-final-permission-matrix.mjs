import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateFeaturePermission } from "../packages/platform-core/src/access/evaluate.ts";

const member = { role: "Member", permissions: [] };
const admin = { role: "Admin", permissions: [] };
const owner = { role: "Owner", permissions: [] };

function allowed(actor, feature) {
  return evaluateFeaturePermission({
    role: actor.role,
    permissions: actor.permissions,
    feature,
  }).allowed;
}

describe("final canonical permission matrix", () => {
  it("keeps organisation-wide sensitive operations away from ordinary Members", () => {
    for (const feature of [
      "communications.email.send",
      "crm.contacts.import",
      "comms.agents.configure",
      "billing.manage",
      "team.manage",
    ]) {
      assert.equal(allowed(member, feature), false, `Member must be denied ${feature}`);
    }
  });

  it("retains ordinary Member day-to-day tenant capabilities", () => {
    for (const feature of [
      "crm.contacts.read",
      "crm.contacts.write",
      "commerce.read",
      "services.jobs.read",
      "communications.read",
      "analytics.read",
    ]) {
      assert.equal(allowed(member, feature), true, `Member should retain ${feature}`);
    }
  });

  it("allows Admin and Owner organisation administration", () => {
    for (const actor of [admin, owner]) {
      for (const feature of [
        "communications.email.send",
        "crm.contacts.import",
        "comms.agents.configure",
        "billing.manage",
        "team.manage",
      ]) {
        assert.equal(allowed(actor, feature), true, `${actor.role} should be allowed ${feature}`);
      }
    }
  });
});
