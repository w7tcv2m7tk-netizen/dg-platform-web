/** Local-only disposable native signing identity. Never imports database code. */
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createPublicKey, verify, randomBytes } from "node:crypto";
import { homedir } from "node:os";
import { lstatSync } from "node:fs";
import { signerPath, signRequest, signingMessage, checkSigner, cloudWorkerSetup } from "./mac-worker-provisioning-client.mjs";
const metadataInspector = process.argv[2];
assert.ok(metadataInspector?.startsWith("/"), "Pass compiled non-secret worker-password metadata inspector");
const inspectPassword = () => {
  const r = spawnSync(metadataInspector, [], { encoding: "utf8" });
  assert.equal(r.status, 0); return JSON.parse(r.stdout);
};
const passwordAccount = "dg-keychain-integration-test";
assert.equal(inspectPassword().count, 0, "Refuse existing disposable worker-password item");
const account = "dg-provisioning-integration-test";
const env = { HOME: homedir(), PATH: "/usr/bin:/bin" };
const run = mode => spawnSync(signerPath, [mode, account], { env, encoding: "utf8", timeout: 10000 });
await checkSigner();
assert.equal(lstatSync(signerPath).mode & 0o777, 0o700);
assert.equal(run("public").status, 1, "Refuse a pre-existing disposable identity; clean it explicitly first");
let ownsIdentity = false;
let attemptedPassword = false;
try {
  const created = run("create");
  ownsIdentity = true; // Creation may commit before a later native assertion fails; always clean exact test tag.
  assert.equal(created.status, 0); assert.equal(created.stderr, "");
  const raw = Buffer.from(created.stdout.trim(), "base64url");
  assert.equal(raw.length, 65); assert.equal(raw[0], 4);
  assert.equal(run("create").status, 1, "Never replace an existing key");
  const metadata = run("public"); assert.equal(metadata.status, 0); assert.equal(metadata.stderr, ""); assert.equal(metadata.stdout, created.stdout);
  // Each native disposable invocation requires private-key export API failure.
  // Successful output is exclusively the public X9.63 key or public DER signature.
  const pub = createPublicKey({ key: { kty: "EC", crv: "P-256", x: raw.subarray(1, 33).toString("base64url"), y: raw.subarray(33).toString("base64url") }, format: "jwk" });
  const message = signingMessage("provision", Buffer.from('{"operation":"provision"}'), String(Date.now()), randomBytes(32).toString("hex"));
  const signature = await signRequest(message, spawn, account);
  assert.ok(verify("sha256", Buffer.from(message), pub, Buffer.from(signature, "base64url")));
  const child = spawn(signerPath, ["sign", account], { env, stdio: ["pipe", "pipe", "pipe"] });
  let stdout = "", stderr = "";
  child.stdout.on("data", bytes => stdout += bytes.toString()); child.stderr.on("data", bytes => stderr += bytes.toString());
  const completed = new Promise((resolve, reject) => { child.on("error", reject); child.on("close", resolve); });
  const inspection = spawnSync("/bin/ps", ["eww", "-p", String(child.pid), "-o", "command="], { encoding: "utf8" });
  assert.equal(inspection.status, 0); assert.ok(inspection.stdout.includes(signerPath));
  for (const forbidden of ["DATABASE_URL=", "AI_JOB_ENCRYPTION_KEY_V1=", "dgw_", "PRIVATE KEY", message]) assert.ok(!inspection.stdout.includes(forbidden));
  child.stdin.end(message); assert.equal(await completed, 0); assert.equal(stderr, ""); assert.match(stdout, /^[A-Za-z0-9_-]{8,96}\n$/);
  const safeOutput = [];
  attemptedPassword = true;
  const status = await cloudWorkerSetup({ mode: "provision" }, {
    sign: message => signRequest(message, spawn, account),
    fetchRequest: async (url, options) => {
      assert.equal(options.redirect, "error");
      const bytes = options.body;
      const message = signingMessage("provision", bytes, options.headers["x-dg-timestamp"], options.headers["x-dg-nonce"]);
      assert.ok(verify("sha256", Buffer.from(message), pub, Buffer.from(options.headers["x-dg-signature"], "base64url")));
      // Simulated cloud response only; no Production request/database import.
      const credential = `dgw_${randomBytes(32).toString("base64url")}`;
      return Response.json({ name: "dg-mac-1", modelId: "dg-fast:latest", modelDigest: "bb416f08ee253472fdb015ecc32db5ad8fbf0baf76226781fb62b711835c0f7d", lane: "local_routine", endpointKind: "ollama_loopback", workerId: passwordAccount, deploymentId: "disposable-deployment", requestId: options.headers["x-dg-nonce"], credential }, { headers: { "cache-control": "no-store" } });
    },
    output: metadata => safeOutput.push(metadata),
  });
  assert.equal(status, 0); assert.equal(safeOutput[0].keychainInstalled, true);
  assert.ok(!/dgw_[A-Za-z0-9_-]{43}/.test(JSON.stringify(safeOutput)));
  const installed = inspectPassword();
  assert.equal(installed.count, 1); assert.equal(installed.items[0].account, passwordAccount); assert.equal(installed.items[0].service, "com.digitalgate.ai-worker");
  console.log("Native signing → simulated HTTPS response → real anonymous pipe/Keychain installation passed");
  console.log("Disposable signing identity: single exact Keychain tag; non-exportable create/sign; signature verified; stable mode700; argv/env/output safe");
} finally {
  if (attemptedPassword) {
    const removed = spawnSync("/usr/bin/security", ["delete-generic-password", "-s", "com.digitalgate.ai-worker", "-a", passwordAccount], { stdio: "ignore" });
    assert.equal(removed.status, 0); assert.equal(inspectPassword().count, 0);
    console.log("Disposable worker-password item removed");
  }
  if (ownsIdentity) {
    assert.equal(run("test-remove").status, 0);
    assert.equal(run("public").status, 1, "Disposable signing identity must be gone");
    console.log("Disposable signing identity removed");
  }
}
