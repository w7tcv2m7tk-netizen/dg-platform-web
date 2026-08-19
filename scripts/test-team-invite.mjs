import assert from "node:assert/strict";
import { describe, it } from "node:test";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function load() {
  return import(
    pathToFileURL(
      path.join(__dirname, "../packages/platform-core/src/org/team-invites.ts"),
    ).href
  );
}

describe("team invite helpers", () => {
  it("normalises invite roles and placeholder ids", async () => {
    const {
      normalizeTeamInviteRole,
      teamInvitePlaceholderId,
      parseTeamInviteMetadata,
    } = await load();
    assert.equal(normalizeTeamInviteRole("admin"), "admin");
    assert.equal(normalizeTeamInviteRole("member"), "member");
    assert.equal(normalizeTeamInviteRole("owner"), "member");
    assert.equal(
      teamInvitePlaceholderId("Ben@DigitalGate.com.au"),
      "invite:ben@digitalgate.com.au",
    );
    assert.deepEqual(
      parseTeamInviteMetadata({
        dgOrganisationId: "org_1",
        dgRole: "admin",
      }),
      { organisationId: "org_1", role: "admin" },
    );
  });
});
