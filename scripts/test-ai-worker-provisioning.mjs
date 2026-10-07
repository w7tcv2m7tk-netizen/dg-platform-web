import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, createHash, sign, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { productionDatabaseConfigured, provisioningConfig, verifyProvisionRequest, signingMessage, readProvisionBody, PINNED_WORKER, PROVISION_ORIGIN, PROVISION_PATH } from "../packages/platform-core/src/ai/local-worker-provisioning.ts";
import { cloudWorkerSetup, signingMessage as clientMessage, boundedResponse, signRequest } from "./mac-worker-provisioning-client.mjs";
import { provisioningAudit } from "../packages/platform-core/src/ai/local-worker-provisioning-audit.ts";
import { EventEmitter } from "node:events";
const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" }); // Disposable unit key, never serialized.
const jwk = publicKey.export({ format: "jwk" });
const raw = Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, "base64url"), Buffer.from(jwk.y, "base64url")]);
const now = Date.now();
const env = { VERCEL_ENV: "production", AI_WORKER_PROVISIONING_ENABLED: "true", AI_WORKER_PROVISIONING_START: new Date(now - 1000).toISOString(), AI_WORKER_PROVISIONING_END: new Date(now + 300000).toISOString(), AI_WORKER_PROVISIONING_WINDOW_ID: "a".repeat(32), AI_WORKER_PROVISIONING_PUBLIC_KEY: raw.toString("base64url"), AI_WORKER_PROVISIONING_FINGERPRINT: createHash("sha256").update(raw).digest("hex") };
const config = provisioningConfig(env, now);
function signed(body = { operation: "provision" }, changes = {}) {
  const bytes = Buffer.from(JSON.stringify(body));
  const timestamp = String(changes.time ?? now), nonce = randomBytes(32).toString("hex");
  const signature = sign("sha256", Buffer.from(signingMessage(body.operation, bytes, timestamp, nonce)), privateKey).toString("base64url");
  return { bytes, request: new Request(changes.url ?? PROVISION_ORIGIN + PROVISION_PATH, { method: changes.method ?? "POST", headers: { "content-type": "application/json", "x-dg-timestamp": timestamp, "x-dg-nonce": nonce, "x-dg-signature": signature, ...changes.headers }, body: bytes }) };
}
test("activation window is Production only, explicit, bounded, fingerprint matched and fail-closed", () => {
  assert.ok(config);
  for (const changes of [{ VERCEL_ENV: "preview" }, { AI_WORKER_PROVISIONING_ENABLED: undefined }, { AI_WORKER_PROVISIONING_ENABLED: "false" }, { AI_WORKER_PROVISIONING_FINGERPRINT: "b".repeat(64) }, { AI_WORKER_PROVISIONING_PUBLIC_KEY: "invalid" }, { AI_WORKER_PROVISIONING_START: "invalid" }, { AI_WORKER_PROVISIONING_END: new Date(now + 900001).toISOString() }, { AI_WORKER_PROVISIONING_WINDOW_ID: "invalid" }, { AI_WORKER_PROVISIONING_END: new Date(now - 1).toISOString() }]) assert.equal(provisioningConfig({ ...env, ...changes }, now), null);
});
test("valid canonical signatures match client; arbitrary authority-bearing fields rejected", () => {
  const good = signed(); assert.ok(verifyProvisionRequest(good.request, good.bytes, config, now));
  assert.equal(clientMessage("provision", good.bytes, String(now), "a".repeat(64)), signingMessage("provision", good.bytes, String(now), "a".repeat(64)));
  for (const key of ["tenantId", "modelId", "modelDigest", "lane", "endpointKind", "name", "capabilities", "workerId"]) {
    const r = signed({ operation: "provision", [key]: "forbidden" }); assert.equal(verifyProvisionRequest(r.request, r.bytes, config, now), null);
  }
  const r = signed({ operation: "recover", workerId: "worker-1" }); assert.equal(verifyProvisionRequest(r.request, r.bytes, config, now).workerId, "worker-1");
});
test("unauthenticated, bearer/tenant authority, wrong key, stale/future and altered request rejected", () => {
  for (const changes of [{ headers: { "x-dg-signature": "", authorization: "Bearer tenant-key" } }, { time: now - 30001 }, { time: now + 30001 }, { url: PROVISION_ORIGIN + PROVISION_PATH + "?credential=no" }, { url: "https://example.com" + PROVISION_PATH }, { url: "http://app.digitalgate.com.au" + PROVISION_PATH }, { url: PROVISION_ORIGIN + PROVISION_PATH + "/other" }, { url: PROVISION_ORIGIN + PROVISION_PATH + "#other" }, { method: "PUT" }]) {
    const r = signed(undefined, changes); assert.equal(verifyProvisionRequest(r.request, r.bytes, config, now), null);
  }
  const r = signed(); assert.equal(verifyProvisionRequest(r.request, Buffer.from('{"operation":"recover","workerId":"worker-1"}'), config, now), null);
  const other = generateKeyPairSync("ec", { namedCurve: "prime256v1" }).publicKey;
  assert.equal(verifyProvisionRequest(r.request, r.bytes, { ...config, key: other }, now), null);
});
test("request stream and response stream are bounded without trust in Content-Length", async () => {
  assert.equal(await readProvisionBody(new Request(PROVISION_ORIGIN, { method: "POST", body: "x".repeat(513) })), null);
  await assert.rejects(boundedResponse(new Response("x".repeat(2049))));
});
const synthetic = `dgw_${"s".repeat(43)}`;
function clientFixture(overrides = {}) {
  const calls = { fetch: 0, install: [], output: [] };
  return { calls, dependencies: { preflight: async () => {}, sign: async () => "public-signature", install: async (...args) => calls.install.push(args), output: value => { assert.ok(!JSON.stringify(value).includes(synthetic)); calls.output.push(value); }, fetchRequest: async (url, options) => {
    calls.fetch++; assert.equal(url, PROVISION_ORIGIN + PROVISION_PATH); assert.equal(options.redirect, "error");
    assert.ok(!JSON.stringify(options).includes(synthetic));
    return Response.json({ ...PINNED_WORKER, workerId: "worker-1", deploymentId: "deployment-1", requestId: options.headers["x-dg-nonce"], credential: synthetic }, { headers: { "cache-control": "no-store" } });
  }, ...overrides } };
}
test("local HTTPS success passes only credential in memory to exact Keychain account", async () => {
  const f = clientFixture(); assert.equal(await cloudWorkerSetup({ mode: "provision" }, f.dependencies), 0);
  assert.deepEqual(f.calls.install, [["worker-1", synthetic]]); assert.equal(f.calls.fetch, 1); assert.equal(f.calls.output[0].keychainInstalled, true);
});
test("DB success / Keychain failure preserves identities and never reprovisions", async () => {
  const f = clientFixture({ install: async () => { throw new Error(synthetic); } });
  assert.equal(await cloudWorkerSetup({ mode: "provision" }, f.dependencies), 1);
  assert.equal(f.calls.fetch, 1); assert.equal(f.calls.output[0].workerId, "worker-1"); assert.equal(f.calls.output[0].keychainInstalled, false);
});
test("ambiguous network result, redirect, invalid response and unsafe preflight never retry", async () => {
  for (const overrides of [{ fetchRequest: async () => { throw new Error(synthetic); } }, { fetchRequest: async () => new Response(null, { status: 302, headers: { location: "https://example.com" } }) }, { fetchRequest: async () => Response.json({ credential: synthetic }, { headers: { "cache-control": "no-store" } }) }, { preflight: async () => { throw new Error(synthetic); } }]) {
    const f = clientFixture(overrides); assert.equal(await cloudWorkerSetup({ mode: "provision" }, f.dependencies), 1); assert.equal(f.calls.install.length, 0); assert.equal(f.calls.output.length, 1);
  }
});
test("recovery request contains only exact worker identity", async () => {
  const f = clientFixture(); const original = f.dependencies.fetchRequest;
  f.dependencies.fetchRequest = (url, options) => { assert.deepEqual(JSON.parse(options.body.toString()), { operation: "recover", workerId: "worker-1" }); return original(url, options); };
  assert.equal(await cloudWorkerSetup({ mode: "recover", workerId: "worker-1" }, f.dependencies), 0);
});
test("native signer argv/env contains no secret, only non-secret message uses stdin", async () => {
  const sig = "a".repeat(96);
  const result = await signRequest("public-request", (path, args, options) => {
    assert.ok(path.endsWith("/DigitalGate/bin/mac-worker-provisioning-sign")); assert.deepEqual(args, ["sign", "dg-mac-1"]); assert.deepEqual(Object.keys(options.env).sort(), ["HOME", "PATH"]);
    const child = new EventEmitter(); child.stdin = new EventEmitter(); child.stdout = new EventEmitter(); child.stdin.end = message => { assert.equal(message, "public-request"); queueMicrotask(() => { child.stdout.emit("data", Buffer.from(sig + "\n")); child.emit("close", 0); }); }; return child;
  }); assert.equal(result, sig);
});
test("route never logs or throws raw errors; no-store and narrow exemption", () => {
  const route = readFileSync(new URL("../src/app/api/internal/ai-worker/provisioning/route.ts", import.meta.url), "utf8");
  assert.match(route, /"Cache-Control": "no-store"/); assert.doesNotMatch(route, /console\.|captureException|throw /);
  const wrapper = readFileSync(new URL("./provision-ai-local-worker-keychain.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(wrapper, /DATABASE_URL|@dg\/database/);
});

test("audit whitelist drops credential, signature, arbitrary fields and unsafe identities", () => {
  const events = [];
  provisioningAudit("outcome", "succeeded", { fingerprint: "a".repeat(64), requestId: "b".repeat(64), operation: "provision", workerId: "worker-1", deploymentId: "deployment-1", credential: synthetic, error: synthetic, signature: synthetic }, x => events.push(x));
  assert.deepEqual(Object.keys(events[0]).sort(), ["deploymentId", "eventType", "fingerprint", "operation", "outcome", "requestId", "timestamp", "workerId"].sort());
  assert.ok(!JSON.stringify(events).includes(synthetic));
  provisioningAudit("outcome", "unauthorized", { fingerprint: synthetic, requestId: synthetic, operation: "provision" }, x => events.push(x));
  assert.ok(!JSON.stringify(events).includes(synthetic));
});

test("Production endpoint/database/role are pinned without returning credentials", () => {
  const target = { DG_NEON_ENV: "production", DATABASE_URL: "postgresql://neondb_owner@ep-bold-tree-a7bny92m-pooler.c-2.ap-southeast-2.aws.neon.tech/neondb?sslmode=require" };
  assert.equal(productionDatabaseConfigured(target), true);
  for (const text of ["ep-other", "other_role", "otherdb"]) {
    const source = text === "ep-other" ? "ep-bold-tree-a7bny92m" : text === "other_role" ? "neondb_owner" : "neondb";
    assert.equal(productionDatabaseConfigured({ ...target, DATABASE_URL: target.DATABASE_URL.replace(source, text) }), false);
  }
  assert.equal(productionDatabaseConfigured({ ...target, DG_NEON_ENV: "preview" }), false);
});
test("real handler fails closed, unauthenticated response is no-store, all methods denied", async () => {
  const route = await import("../src/app/api/internal/ai-worker/provisioning/route.ts");
  const prev = process.env.AI_WORKER_PROVISIONING_ENABLED;
  try {
    delete process.env.AI_WORKER_PROVISIONING_ENABLED;
    const result = await route.POST(new Request(PROVISION_ORIGIN + PROVISION_PATH, { method: "POST", body: "{}" }));
    assert.equal(result.status, 403); assert.equal(result.headers.get("cache-control"), "no-store");
    for (const method of ["GET", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]) { const r = route[method](); assert.equal(r.status, 405); assert.equal(r.headers.get("cache-control"), "no-store"); }
  } finally { if (prev === undefined) delete process.env.AI_WORKER_PROVISIONING_ENABLED; else process.env.AI_WORKER_PROVISIONING_ENABLED = prev; }
});

test("local TLS verification cannot be disabled through inherited environment", async () => {
  const saved = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    const fixture = clientFixture();
    assert.equal(await cloudWorkerSetup({ mode: "provision" }, fixture.dependencies), 1);
    assert.equal(fixture.calls.fetch, 0); assert.equal(fixture.calls.install.length, 0);
  } finally { if (saved === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED; else process.env.NODE_TLS_REJECT_UNAUTHORIZED = saved; }
});
