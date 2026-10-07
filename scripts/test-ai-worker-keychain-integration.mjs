// Explicit opt-in LOCAL test. No database imports or production provisioner.
import { randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { statSync } from "node:fs";
import { helperPath } from "./mac-worker-keychain.mjs";

const account = "dg-keychain-integration-test";
const metadataTool = process.argv[2];
function requireSafe(condition) { if (!condition) throw new Error("Local Keychain check failed"); }
function metadata() {
  const child = spawnSync(metadataTool, [], { encoding: "utf8", env: { HOME: process.env.HOME, PATH: "/usr/bin:/bin" } });
  requireSafe(child.status === 0);
  return JSON.parse(child.stdout);
}
async function install() {
  const random = randomBytes(32);
  const secret = Buffer.from(`dgw_${random.toString("base64url")}`);
  random.fill(0);
  try {
    await new Promise((resolve, reject) => {
      const args = [account];
      const env = { HOME: process.env.HOME, PATH: "/usr/bin:/bin" };
      requireSafe(!JSON.stringify({ args, env }).includes(secret.toString()));
      const child = spawn(helperPath, args, { env, stdio: ["pipe", "pipe", "pipe"] });
      let outputBytes = 0;
      child.stdout.on("data", (data) => { outputBytes += data.length; });
      child.stderr.on("data", (data) => { outputBytes += data.length; });
      const fail = () => { child.kill(); reject(new Error("Local Keychain check failed")); };
      child.on("error", fail); child.stdin.on("error", fail);
      const timer = setTimeout(fail, 30_000);
      child.on("close", (code) => { clearTimeout(timer); if (code === 0 && outputBytes === 0) resolve(); else fail(); });
      // Helper blocks on stdin. Inspect its real argv/environment before releasing input.
      child.on("spawn", () => {
        const processes = spawnSync("/bin/ps", ["eww", "-p", String(child.pid), "-o", "command="], { encoding: "utf8" });
        if (processes.status !== 0 || !processes.stdout.includes(account) || processes.stdout.includes(secret.toString())) { fail(); return; }
        child.stdin.end(secret);
      });
    });
  } finally { secret.fill(0); }
}

let owned = false;
let result = 1;
try {
  requireSafe(process.platform === "darwin" && !!metadataTool);
  requireSafe((statSync(helperPath).mode & 0o777) === 0o700);
  requireSafe(metadata().count === 0); // Never touch a pre-existing item.
  owned = true;
  await install();
  const created = metadata();
  requireSafe(created.count === 1 && created.items[0].service === "com.digitalgate.ai-worker" && created.items[0].account === account);
  // Default decrypt ACL is restricted to the helper; other ACL operations may be allow-any.
  const decrypt = created.items[0].acl.filter((acl) => acl.authorizations.includes("ACLAuthorizationDecrypt"));
  requireSafe(decrypt.length > 0 && decrypt.every((acl) => !acl.allowAnyApplication && acl.apps.includes(helperPath)));
  await install();
  const updated = metadata();
  requireSafe(updated.count === 1 && JSON.stringify(updated.items) === JSON.stringify(created.items));
  process.stdout.write(JSON.stringify({ create: true, update: true, count: 1, serviceExact: true, accountExact: true, aclUnchanged: true, decryptAclRestricted: true, outputEmpty: true, processSecretAbsent: true }) + "\n");
  result = 0;
} catch {
  process.stderr.write("Local Keychain integration check failed; no credential displayed\n");
} finally {
  if (owned) {
    try {
      // security's delete verb emits attributes only; never use -g or -w readback.
      const removed = spawnSync("/usr/bin/security", ["delete-generic-password", "-s", "com.digitalgate.ai-worker", "-a", account], {
        stdio: "ignore", env: { HOME: process.env.HOME, PATH: "/usr/bin:/bin" },
      });
      requireSafe(removed.status === 0);
      requireSafe(metadata().count === 0);
      process.stdout.write('{"disposableItemRemoved":true}\n');
    } catch { process.stderr.write("Disposable Keychain cleanup failed; remove exact test service/account manually\n"); result = 1; }
  }
}
process.exitCode = result;
