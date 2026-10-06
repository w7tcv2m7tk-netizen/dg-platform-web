import { execFileSync } from "node:child_process";

export const OLLAMA_BASE_URL = "http://127.0.0.1:11434";
export const OLLAMA_MODEL = "dg-fast:latest";
export const OLLAMA_PROFILE = Object.freeze({ num_ctx: 4096, temperature: 0.2, top_k: 20, top_p: 0.9, presence_penalty: 1.5 });

export type WorkerConfig = { gatewayUrl: URL; workerId: string; expectedModelDigest: string };

export function readConfig(env: Record<string, string | undefined> = process.env): WorkerConfig {
  const rawUrl = env.DG_AI_GATEWAY_URL ?? "";
  const gatewayUrl = new URL(rawUrl);
  if (gatewayUrl.protocol !== "https:" || gatewayUrl.username || gatewayUrl.password || gatewayUrl.search || gatewayUrl.hash) {
    throw new Error("Gateway URL must be an HTTPS origin/path without embedded credentials");
  }
  const workerId = env.DG_AI_WORKER_ID ?? "";
  const expectedModelDigest = env.DG_FAST_OLLAMA_DIGEST ?? "";
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(workerId) || !/^(sha256:)?[a-f0-9]{64}$/i.test(expectedModelDigest)) {
    throw new Error("Worker identity or pinned dg-fast digest is missing");
  }
  return { gatewayUrl, workerId, expectedModelDigest };
}

export function readKeychainCredential(workerId: string): string {
  if (process.platform !== "darwin") throw new Error("The Slice 3 worker requires macOS Keychain");
  const secret = execFileSync("/usr/bin/security", ["find-generic-password", "-a", workerId, "-s", "com.digitalgate.ai-worker", "-w"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  if (!/^dgw_[A-Za-z0-9_-]{43}$/.test(secret)) throw new Error("Worker credential unavailable in Keychain");
  return secret;
}
