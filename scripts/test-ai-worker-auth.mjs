import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { authenticateAiWorker, createAiWorkerCredential } from "../packages/platform-core/src/ai/local-worker-auth.ts";

const hash = (secret) => createHash("sha256").update(secret).digest("hex");

test("worker credential is high entropy and never accepted without Bearer framing", async () => {
  const credential = createAiWorkerCredential();
  assert.match(credential, /^dgw_[A-Za-z0-9_-]{43}$/);
  let lookups = 0;
  const repo = { findCredentialCandidates: async () => { lookups += 1; return []; }, touch: async () => {} };
  assert.equal(await authenticateAiWorker(new Request("https://unit.test", { headers: { authorization: credential } }), repo), null);
  assert.equal(lookups, 0);
});

test("worker authentication uses only a hash, supports expiring rotation overlap, and touches lastSeen", async () => {
  const credential = createAiWorkerCredential();
  const oldCredential = createAiWorkerCredential();
  const currentHash = hash(credential);
  const oldHash = hash(oldCredential);
  let receivedHash = "";
  let touched = "";
  const repo = {
    findCredentialCandidates: async (provided) => {
      receivedHash = provided;
      return [{ id: "worker-1", name: "Mac", credentialHash: currentHash, previousCredentialHash: oldHash,
        previousCredentialExpiresAt: new Date(Date.now() + 30_000) }];
    },
    touch: async (id) => { touched = id; },
  };
  const request = (secret) => new Request("https://unit.test", { headers: { authorization: `Bearer ${secret}` } });
  assert.deepEqual(await authenticateAiWorker(request(oldCredential), repo), { id: "worker-1", name: "Mac" });
  assert.equal(receivedHash, oldHash);
  assert.equal(touched, "worker-1");
  const expiredRepo = { ...repo, findCredentialCandidates: async () => [{ id: "worker-1", name: "Mac", credentialHash: currentHash,
    previousCredentialHash: oldHash, previousCredentialExpiresAt: new Date(Date.now() - 1) }] };
  assert.equal(await authenticateAiWorker(request(oldCredential), expiredRepo), null);
});

test("revoked or unknown principals do not authenticate", async () => {
  const credential = createAiWorkerCredential();
  const repo = { findCredentialCandidates: async () => [], touch: async () => { assert.fail("revoked worker must not be touched"); } };
  assert.equal(await authenticateAiWorker(new Request("https://unit.test", { headers: { authorization: `Bearer ${credential}` } }), repo), null);
});
