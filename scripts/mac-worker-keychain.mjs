import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

export const helperPath = join(homedir(), "Library/Application Support/DigitalGate/bin/mac-worker-keychain");

export function keychainCall(account, credential, launch = spawn) {
  return new Promise((resolve, reject) => {
    const child = launch(helperPath, [account], {
      stdio: ["pipe", "ignore", "ignore"],
      env: { HOME: homedir(), PATH: "/usr/bin:/bin" },
    });
    const fail = () => reject(new Error("Keychain installation failed"));
    child.on("error", fail);
    child.stdin.on("error", fail);
    child.on("close", (code) => code === 0 ? resolve() : fail());
    // The secret travels only over an anonymous pipe. Never inherit DATABASE_URL.
    child.stdin.end(credential ?? "");
  });
}

export async function secureWorkerSetup({ mode, workerId }, dependencies) {
  const { provision, rotate, findExisting, install, preflight, output } = dependencies;
  const metadata = { modelId: "dg-fast:latest", modelDigest: "bb416f08ee253472fdb015ecc32db5ad8fbf0baf76226781fb62b711835c0f7d",
    lane: "local_routine", endpointKind: "ollama_loopback" };
  let identity;
  try {
    await preflight();
    if (mode === "provision") {
      if (await findExisting("dg-mac-1")) throw new Error("Existing principal requires recovery");
      const created = await provision({ name: "dg-mac-1", modelDigest: metadata.modelDigest });
      identity = { workerId: created.workerId, deploymentId: created.deploymentId };
      await install(identity.workerId, created.credential);
    } else if (mode === "recover" && /^[A-Za-z0-9_-]{1,120}$/.test(workerId ?? "")) {
      const existing = await findExisting("dg-mac-1", workerId);
      if (!existing || existing.workerId !== workerId) throw new Error("Recovery identity mismatch");
      identity = { workerId: existing.workerId, deploymentId: existing.deploymentId };
      const credential = await rotate(workerId);
      await install(workerId, credential);
    } else { throw new Error("Invalid mode"); }
    output({ ...metadata, ...identity, keychainInstalled: true });
    return 0;
  } catch {
    // Never stringify caught errors, Prisma objects, subprocess output, or credentials.
    output({ ...metadata, ...identity, keychainInstalled: false,
      recovery: identity ? "STOP: recover this worker ID; do not provision again" : "STOP: inspect existing dg-mac-1 records before retrying" });
    return 1;
  }
}
