import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import type { WorkerConfig } from "./config.ts";
import type { GatewayClient, ClaimedJob } from "./client.ts";
import { assertPinnedModel, OllamaContractError, runOllama } from "./ollama.ts";

const SLEEP_MS = 2_000;
const HEARTBEAT_MS = 10_000;

export class MacAiWorker {
  private stopping = false;
  private activeInference: AbortController | null = null;
  private readonly config: WorkerConfig;
  private readonly client: GatewayClient;
  private readonly log: (message: string) => void;
  constructor(config: WorkerConfig, client: GatewayClient,
    log: (message: string) => void = (message) => process.stdout.write(`${message}\n`)) {
    this.config = config;
    this.client = client;
    this.log = log;
  }

  stop() { this.stopping = true; this.activeInference?.abort(new Error("worker_stopping")); }

  async run() {
    while (!this.stopping) {
      try {
        const job = await this.client.claim(randomUUID(), Date.now());
        if (job) await this.process(job);
        else await delay(SLEEP_MS);
      } catch (error) {
        const code = error instanceof Error && /^[a-z_]{1,48}$/.test(error.message) ? error.message : "worker_operation_failed";
        this.log(`[ai-worker] ${code}`);
        await delay(SLEEP_MS);
      }
    }
  }

  private async process(job: ClaimedJob) {
    if (job.modelDigest !== this.config.expectedModelDigest) {
      await this.fail(job, "model_identity_mismatch", false);
      return;
    }
    const inference = new AbortController();
    this.activeInference = inference;
    const workerDeadline = AbortSignal.timeout(90_000);
    const inferenceSignal = AbortSignal.any([inference.signal, workerDeadline]);
    const heartbeatStop = new AbortController();
    let done = false;
    let cancelled = false;
    let leaseLost = false;
    let sequence = 0;
    const heartbeat = (async () => {
      while (!done && !inference.signal.aborted) {
        try { await delay(HEARTBEAT_MS, undefined, { signal: heartbeatStop.signal }); }
        catch { return; }
        if (done || inference.signal.aborted) return;
        try {
          sequence += 1;
          const status = await this.client.heartbeat({ jobId: job.id, leaseToken: job.leaseToken,
            generation: job.leaseGeneration, operationId: randomUUID(), sequence });
          if (status.cancelRequested) {
            cancelled = true;
            inference.abort(new Error("cancelled"));
            return;
          }
        } catch {
          leaseLost = true;
          inference.abort(new Error("lease_lost"));
          return;
        }
      }
    })();

    try {
      await assertPinnedModel(this.config.expectedModelDigest, inferenceSignal);
      const result = await runOllama(job, inferenceSignal);
      done = true;
      heartbeatStop.abort();
      await heartbeat;
      if (cancelled || leaseLost || this.stopping) return;
      await this.client.complete({ jobId: job.id, leaseToken: job.leaseToken, generation: job.leaseGeneration,
        operationId: randomUUID(), outcome: "succeeded", text: result.text, modelId: result.modelId,
        modelDigest: this.config.expectedModelDigest, tokensIn: result.tokensIn, tokensOut: result.tokensOut });
      this.log(`[ai-worker] completed ${job.id}`);
    } catch (error) {
      done = true;
      heartbeatStop.abort();
      await heartbeat;
      if (cancelled || leaseLost || this.stopping) return;
      const failureCode = workerDeadline.aborted ? "inference_timeout" : error instanceof OllamaContractError ? error.code : "inference_failed";
      const retryable = failureCode === "ollama_unavailable" || failureCode === "inference_timeout";
      await this.fail(job, failureCode, retryable);
    } finally {
      if (this.activeInference === inference) this.activeInference = null;
    }
  }

  private async fail(job: ClaimedJob, failureCode: string, retryable: boolean) {
    try {
      await this.client.complete({ jobId: job.id, leaseToken: job.leaseToken, generation: job.leaseGeneration,
        operationId: randomUUID(), outcome: "failed", failureCode, retryable });
    } catch {
      // Safe to retry later only through a new lease; never log worker credentials or payload.
    }
  }
}
