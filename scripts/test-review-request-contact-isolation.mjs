import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const routePath = path.join(
  __dirname,
  "../src/app/api/v1/reviews/requests/route.ts",
);

describe("review request contact tenant isolation", () => {
  it("resolves supplied contactId inside the authenticated organisation before queueing", async () => {
    const source = await readFile(routePath, "utf8");

    assert.match(source, /getContact\(session\.organisationId, contactId\)/);
    assert.match(source, /code:\s*"linked_contact_not_found"/);
    assert.match(source, /status:\s*422/);
    assert.match(source, /contactId:\s*contactId \|\| null/);

    const lookupAt = source.indexOf("getContact(session.organisationId, contactId)");
    const queueAt = source.indexOf("queueReviewRequest({");
    assert.ok(lookupAt >= 0 && queueAt > lookupAt, "contact isolation must run before queueReviewRequest");
  });
});
