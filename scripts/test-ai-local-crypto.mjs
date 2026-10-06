import test from "node:test";
import assert from "node:assert/strict";
import { decryptAiJobContent, encryptAiJobContent } from "../packages/platform-core/src/ai/local-crypto.ts";

const original = { key1: process.env.AI_JOB_ENCRYPTION_KEY_V1, key2: process.env.AI_JOB_ENCRYPTION_KEY_V2,
  current: process.env.AI_JOB_ENCRYPTION_CURRENT_VERSION };
const aad = { jobId: "job-a", organisationId: "org-a", task: "lead_summary", taskVersion: 1,
  policyVersion: 1, classification: "tenant_confidential", deploymentId: "dep-a", kind: "payload" };

test("AES-GCM uses a fresh nonce and authenticates the complete AAD", () => {
  process.env.AI_JOB_ENCRYPTION_KEY_V1 = "11".repeat(32);
  process.env.AI_JOB_ENCRYPTION_CURRENT_VERSION = "v1";
  const a = encryptAiJobContent("secret CRM prompt", aad);
  const b = encryptAiJobContent("secret CRM prompt", aad);
  assert.equal(a.nonce.length, 12);
  assert.equal(a.ciphertext.length, Buffer.byteLength("secret CRM prompt") + 16);
  assert.notDeepEqual(a.nonce, b.nonce);
  assert.equal(decryptAiJobContent(a, aad), "secret CRM prompt");
  assert.throws(() => decryptAiJobContent(a, { ...aad, organisationId: "org-b" }));
  assert.throws(() => decryptAiJobContent({ ...a, keyVersion: "v9" }, aad));
});

test("versioned decryption continues to read v1 after writes move to v2", () => {
  process.env.AI_JOB_ENCRYPTION_KEY_V1 = "22".repeat(32);
  process.env.AI_JOB_ENCRYPTION_KEY_V2 = "33".repeat(32);
  process.env.AI_JOB_ENCRYPTION_CURRENT_VERSION = "v1";
  const old = encryptAiJobContent("old result", { ...aad, kind: "result" });
  process.env.AI_JOB_ENCRYPTION_CURRENT_VERSION = "v2";
  const fresh = encryptAiJobContent("new result", { ...aad, kind: "result" });
  assert.equal(fresh.keyVersion, "v2");
  assert.equal(decryptAiJobContent(old, { ...aad, kind: "result" }), "old result");
  assert.equal(decryptAiJobContent(fresh, { ...aad, kind: "result" }), "new result");
});

test.after(() => {
  for (const [key, value] of [["AI_JOB_ENCRYPTION_KEY_V1", original.key1], ["AI_JOB_ENCRYPTION_KEY_V2", original.key2],
    ["AI_JOB_ENCRYPTION_CURRENT_VERSION", original.current]]) value === undefined ? delete process.env[key] : process.env[key] = value;
});
