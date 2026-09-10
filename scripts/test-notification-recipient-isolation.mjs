import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const notificationsPath = path.join(
  __dirname,
  "../packages/platform-core/src/notifications/index.ts",
);

describe("notification mark-read recipient isolation", () => {
  it("scopes both mark-all and explicit-id updates to global or current-user notifications", async () => {
    const source = await readFile(notificationsPath, "utf8");
    const start = source.indexOf("export async function markNotificationsRead");
    assert.ok(start >= 0, "markNotificationsRead must exist");

    const body = source.slice(start, source.indexOf("\nexport ", start + 1) >= 0
      ? source.indexOf("\nexport ", start + 1)
      : undefined);

    assert.match(body, /const recipientWhere:[\s\S]*recipientUserId:\s*null[\s\S]*recipientUserId:\s*input\.recipientUserId/);

    const uses = body.match(/\.\.\.recipientWhere/g) ?? [];
    assert.equal(uses.length, 2, "recipient filter must guard both updateMany paths");

    assert.match(body, /organisationId:\s*input\.organisationId[\s\S]*readAt:\s*null[\s\S]*\.\.\.recipientWhere/);
    assert.match(body, /organisationId:\s*input\.organisationId[\s\S]*id:\s*\{\s*in:\s*ids\s*\}[\s\S]*readAt:\s*null[\s\S]*\.\.\.recipientWhere/);
  });
});
