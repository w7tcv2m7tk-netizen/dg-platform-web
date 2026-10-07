import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { keychainCall, secureWorkerSetup } from "./mac-worker-keychain.mjs";

const credential = `dgw_${"s".repeat(43)}`; // Synthetic only.
function fixture(overrides = {}) {
  const calls = { provision: 0, rotate: [], install: [], output: [] };
  return { calls, dependencies: {
    preflight: async () => {}, findExisting: async () => false,
    provision: async (input) => { calls.provision++; assert.equal(input.name, "dg-mac-1"); return { workerId: "worker-1", deploymentId: "deployment-1", credential }; },
    rotate: async (id) => { calls.rotate.push(id); return credential; },
    install: async (...args) => { calls.install.push(args); },
    output: (value) => { calls.output.push(value); assert.ok(!JSON.stringify(value).includes(credential)); },
    ...overrides,
  } };
}
test("native transport uses pipe only, minimal environment, and no child output", async () => {
  let received;
  await keychainCall("worker-1", credential, (path, args, options) => {
    assert.ok(path.endsWith("/DigitalGate/bin/mac-worker-keychain"));
    assert.deepEqual(args, ["worker-1"]);
    assert.deepEqual(options.stdio, ["pipe", "ignore", "ignore"]);
    assert.deepEqual(Object.keys(options.env).sort(), ["HOME", "PATH"]);
    assert.ok(!JSON.stringify({ args, options }).includes(credential));
    const child = new EventEmitter(); child.stdin = new EventEmitter();
    child.stdin.end = (value) => { received = value; queueMicrotask(() => child.emit("close", 0)); };
    return child;
  });
  assert.equal(received, credential);
});
test("provision emits only pinned safe metadata and uses exact generated account", async () => {
  const { calls, dependencies } = fixture();
  assert.equal(await secureWorkerSetup({ mode: "provision" }, dependencies), 0);
  assert.deepEqual(calls.install, [["worker-1", credential]]);
  assert.deepEqual(calls.output[0], { modelId: "dg-fast:latest", modelDigest: "bb416f08ee253472fdb015ecc32db5ad8fbf0baf76226781fb62b711835c0f7d", lane: "local_routine", endpointKind: "ollama_loopback", workerId: "worker-1", deploymentId: "deployment-1", keychainInstalled: true });
});
test("installation failure redacts errors and preserves IDs without retrying", async () => {
  const { calls, dependencies } = fixture({ install: async () => { throw new Error(credential); } });
  assert.equal(await secureWorkerSetup({ mode: "provision" }, dependencies), 1);
  assert.equal(calls.provision, 1); assert.equal(calls.output[0].workerId, "worker-1");
  assert.equal(calls.output[0].keychainInstalled, false);
  assert.deepEqual(calls.rotate, []);
});
test("existing principal or failed helper preflight blocks fresh provisioning", async () => {
  for (const overrides of [{ findExisting: async () => true }, { preflight: async () => { throw new Error(credential); } }]) {
    const { calls, dependencies } = fixture(overrides);
    assert.equal(await secureWorkerSetup({ mode: "provision" }, dependencies), 1);
    assert.equal(calls.provision, 0); assert.equal(calls.install.length, 0);
  }
});
test("recovery rotates only the existing principal, never reprovisions", async () => {
  const { calls, dependencies } = fixture({ findExisting: async (name, id) => { assert.equal(name, "dg-mac-1"); assert.equal(id, "worker-1"); return { workerId: id, deploymentId: "deployment-1" }; } });
  assert.equal(await secureWorkerSetup({ mode: "recover", workerId: "worker-1" }, dependencies), 0);
  assert.deepEqual(calls.rotate, ["worker-1"]); assert.equal(calls.provision, 0);
  assert.deepEqual(calls.install, [["worker-1", credential]]);
});
test("failed recovery never automatically rotates twice; mismatched IDs do not rotate", async () => {
  const { calls, dependencies } = fixture({ findExisting: async () => ({ workerId: "worker-1", deploymentId: "deployment-1" }), install: async () => { throw new Error(credential); } });
  assert.equal(await secureWorkerSetup({ mode: "recover", workerId: "worker-1" }, dependencies), 1);
  assert.deepEqual(calls.rotate, ["worker-1"]);
  assert.equal(await secureWorkerSetup({ mode: "recover", workerId: "other" }, dependencies), 1);
  assert.deepEqual(calls.rotate, ["worker-1"]);
});
test("native helper preserves ACLs, never requests old password, and has no output/file sink", () => {
  const source = readFileSync(new URL("./mac-worker-keychain.swift", import.meta.url), "utf8");
  assert.ok(source.includes('let service = "com.digitalgate.ai-worker"'));
  assert.ok(source.includes("account, nil, nil, &item"));
  assert.ok(source.includes("SecKeychainItemModifyAttributesAndData(item, nil"));
  assert.ok(source.includes("SecKeychainAddGenericPassword"));
  assert.doesNotMatch(source, /print\(|standardOutput|standardError|write\(|SecAccess|SecACL|Process\(/);
});

test("actual process stdout/stderr contains safe metadata only on install failure", () => {
  const program = `
    import { secureWorkerSetup } from './scripts/mac-worker-keychain.mjs';
    const credential = 'dgw_' + 's'.repeat(43);
    process.exitCode = await secureWorkerSetup({mode:'provision'}, {
      preflight: async()=>{}, findExisting: async()=>false,
      provision: async()=>({workerId:'worker-1',deploymentId:'deployment-1',credential}),
      install: async()=>{throw new Error(credential)}, rotate: async()=>{throw new Error('must not rotate')},
      output: x=>process.stdout.write(JSON.stringify(x)+'\\n')
    });`;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", program], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.equal(result.stderr, "");
  assert.ok(!result.stdout.includes(credential));
  const value = JSON.parse(result.stdout);
  assert.equal(value.workerId, "worker-1");
  assert.equal(value.keychainInstalled, false);
});
