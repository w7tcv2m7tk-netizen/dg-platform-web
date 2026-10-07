import { spawn } from "node:child_process";
import { randomBytes, createHash } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import { stat, lstat } from "node:fs/promises";
import { keychainCall } from "./mac-worker-keychain.mjs";

export const origin = "https://app.digitalgate.com.au";
export const endpoint = "/api/internal/ai-worker/provisioning";
export const signerPath = join(homedir(), "Library/Application Support/DigitalGate/bin/mac-worker-provisioning-sign");
const pinned = { modelId: "dg-fast:latest", modelDigest: "bb416f08ee253472fdb015ecc32db5ad8fbf0baf76226781fb62b711835c0f7d", lane: "local_routine", endpointKind: "ollama_loopback" };
export const signingMessage = (operation, bytes, timestamp, nonce) => JSON.stringify(["dg-worker-provisioning-v1", origin, "POST", endpoint, operation, createHash("sha256").update(bytes).digest("hex"), timestamp, nonce]);

export async function checkSigner() {
  const info = await lstat(signerPath);
  if (!info.isFile() || info.isSymbolicLink() || (info.mode & 0o777) !== 0o700 || info.uid !== process.getuid()) throw new Error("Signer unavailable");
  const parent = await stat(join(signerPath, ".."));
  if (parent.uid !== process.getuid() || (parent.mode & 0o022)) throw new Error("Signer directory unsafe");
}
export function signRequest(message, launch = spawn, account = "dg-mac-1") {
  return new Promise((resolve, reject) => {
    let settled = false;
    let output = "";
    let child;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      if (!ok) { child?.stdin.destroy(); child?.kill(); reject(new Error("Signing failed")); }
      else resolve(output.trim());
    };
    try {
      child = launch(signerPath, ["sign", account], { stdio: ["pipe", "pipe", "ignore"], env: { HOME: homedir(), PATH: "/usr/bin:/bin" } });
      child.on("error", () => finish(false)); child.stdin.on("error", () => finish(false));
      child.stdout.on("data", bytes => { output += bytes.toString("ascii"); if (output.length > 97) finish(false); });
      child.on("close", code => finish(code === 0 && /^[A-Za-z0-9_-]{8,96}\n?$/.test(output)));
      child.stdin.end(message);
    } catch { finish(false); }
  });
}

export async function boundedResponse(response) {
  if (!response.body) throw new Error("Missing response");
  const reader = response.body.getReader();
  const buffer = Buffer.alloc(2048);
  let count = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      try {
        if (count + part.value.length > buffer.length) { await reader.cancel(); throw new Error("Response too large"); }
        buffer.set(part.value, count); count += part.value.length;
      } finally { part.value.fill(0); }
    }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, count)));
  } finally { buffer.fill(0); reader.releaseLock(); }
}

export async function cloudWorkerSetup({ mode, workerId }, { sign = signRequest, fetchRequest = fetch, preflight = async () => { await checkSigner(); await keychainCall("--check"); }, install = keychainCall, output = value => process.stdout.write(`${JSON.stringify(value)}\n`) } = {}) {
  let identity;
  let requestId;
  let attempted = false;
  let result;
  try {
    if (!((mode === "provision" && !workerId) || (mode === "recover" && /^[A-Za-z0-9_-]{1,120}$/.test(workerId ?? "")))) throw new Error("Invalid operation");
    if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0") throw new Error("TLS verification required");
    await preflight();
    const bytes = Buffer.from(JSON.stringify(mode === "provision" ? { operation: mode } : { operation: mode, workerId }));
    const timestamp = String(Date.now());
    requestId = randomBytes(32).toString("hex");
    const signature = await sign(signingMessage(mode, bytes, timestamp, requestId));
    attempted = true;
    const response = await fetchRequest(origin + endpoint, { method: "POST", redirect: "error", signal: AbortSignal.timeout(15_000), headers: { "Content-Type": "application/json", "x-dg-timestamp": timestamp, "x-dg-nonce": requestId, "x-dg-signature": signature }, body: bytes });
    if (response.status !== 200 || response.redirected || (response.url && response.url !== origin + endpoint) || response.headers.get("cache-control") !== "no-store") { await response.body?.cancel(); throw new Error("Request failed"); }
    result = await boundedResponse(response);
    if (!result || result.workerId?.startsWith("dgw_") || result.deploymentId?.startsWith("dgw_") || Object.keys(result).sort().join(",") !== "credential,deploymentId,endpointKind,lane,modelDigest,modelId,name,requestId,workerId" || !/^[A-Za-z0-9_-]{1,120}$/.test(result.workerId ?? "") || !/^[A-Za-z0-9_-]{1,120}$/.test(result.deploymentId ?? "") || result.requestId !== requestId || result.name !== "dg-mac-1" || Object.entries(pinned).some(([key, value]) => result[key] !== value) || !/^dgw_[A-Za-z0-9_-]{43}$/.test(result.credential ?? "") || (mode === "recover" && result.workerId !== workerId)) throw new Error("Invalid response");
    identity = { workerId: result.workerId, deploymentId: result.deploymentId };
    try { await install(identity.workerId, result.credential); }
    finally { result.credential = undefined; }
    output({ ...pinned, ...identity, requestId, keychainInstalled: true });
    return 0;
  } catch {
    if (result && typeof result === "object") result.credential = undefined;
    output({ ...pinned, ...identity, requestId, keychainInstalled: false, recovery: attempted ? "STOP: inspect production records/request ID; recover existing worker only; never retry automatically" : "STOP: repair local preflight before provisioning" });
    return 1;
  }
}
