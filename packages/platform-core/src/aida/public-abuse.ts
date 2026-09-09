/**
 * Stricter public-LLM abuse limits than website forms.
 * In-memory buckets — same tradeoff as form-spam-guard (per isolate).
 */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_IP = 12;
const MAX_BOOTSTRAP_PER_IP = 20;

const messageBuckets = new Map<string, number[]>();
const bootstrapBuckets = new Map<string, number[]>();

function limited(map: Map<string, number[]>, key: string, max: number): boolean {
  const now = Date.now();
  const hits = (map.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= max) {
    map.set(key, hits);
    return true;
  }
  hits.push(now);
  map.set(key, hits);
  return false;
}

export function aidaPublicIpRateLimited(clientIp: string, kind: "message" | "bootstrap"): boolean {
  const ip = clientIp.trim() || "unknown";
  if (!ip || ip === "unknown") return false;
  if (kind === "bootstrap") return limited(bootstrapBuckets, `boot:${ip}`, MAX_BOOTSTRAP_PER_IP);
  return limited(messageBuckets, `msg:${ip}`, MAX_PER_IP);
}

/** Test helper */
export function resetAidaPublicAbuseBucketsForTests() {
  messageBuckets.clear();
  bootstrapBuckets.clear();
}
