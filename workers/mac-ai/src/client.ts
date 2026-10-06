import type { WorkerConfig } from "./config.ts";

export type ClaimedJob = {
  id: string; task: "lead_summary" | "lead_follow_up"; taskVersion: number; policyVersion: number;
  classification: string; resultContract: "crm_text_v1"; resultContractVersion: number;
  contextBudgetTokens: number; maxOutputTokens: number; deadlineAt: string;
  deploymentId: string; modelId: string; modelDigest: string; leaseToken: string;
  leaseGeneration: number; leaseExpiresAt: string; payload: { messages: Array<{ role: string; content: string }> };
};

export class GatewayClient {
  private readonly config: WorkerConfig;
  private readonly credential: string;
  private readonly fetcher: typeof fetch;
  constructor(config: WorkerConfig, credential: string, fetcher: typeof fetch = fetch) {
    this.config = config;
    this.credential = credential;
    this.fetcher = fetcher;
  }

  async post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
    const url = new URL(path, this.config.gatewayUrl);
    if (url.origin !== this.config.gatewayUrl.origin) throw new Error("Gateway request escaped configured origin");
    const requestSignal = signal ?? AbortSignal.timeout(12_000);
    const response = await this.fetcher(url, { method: "POST", redirect: "error", signal: requestSignal,
      headers: { authorization: `Bearer ${this.credential}`, "content-type": "application/json" }, body: JSON.stringify(body) });
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > 120_000 || !response.body) throw new Error("gateway_response_invalid");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 120_000) { await reader.cancel(); throw new Error("gateway_response_invalid"); }
      chunks.push(value);
    }
    let parsed: { data?: T; error?: { code?: string } } | null = null;
    try { parsed = JSON.parse(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8")); } catch { /* sanitized below */ }
    if (!response.ok) throw new Error(parsed?.error?.code ?? "gateway_request_failed");
    return parsed?.data as T;
  }

  claim(operationId: string, requestTimestamp: number) {
    return this.post<ClaimedJob | null>("/api/internal/ai-worker/claim", { operationId, requestTimestamp });
  }

  heartbeat(input: { jobId: string; leaseToken: string; generation: number; operationId: string; sequence: number }, signal?: AbortSignal) {
    return this.post<{ cancelRequested: boolean; leaseExpiresAt: string | null; deadlineAt: string }>("/api/internal/ai-worker/heartbeat", input, signal);
  }

  complete(input: Record<string, unknown>, signal?: AbortSignal) {
    return this.post<{ status: string; duplicate: boolean }>("/api/internal/ai-worker/complete", input, signal);
  }
}
