import test from "node:test";
import assert from "node:assert/strict";
import { readConfig, OLLAMA_MODEL, OLLAMA_PROFILE } from "../src/config.ts";
import { assertPinnedModel, runOllama, OllamaContractError } from "../src/ollama.ts";
import type { ClaimedJob } from "../src/client.ts";
import { GatewayClient } from "../src/client.ts";
import { MacAiWorker } from "../src/worker.ts";

const digest = "a".repeat(64);
const job: ClaimedJob = { id: "job-a", task: "lead_summary", taskVersion: 1, policyVersion: 1,
  classification: "tenant_confidential", resultContract: "crm_text_v1", resultContractVersion: 1,
  contextBudgetTokens: 4096, maxOutputTokens: 1200, deadlineAt: new Date(Date.now() + 300_000).toISOString(),
  deploymentId: "dep-a", modelId: OLLAMA_MODEL, modelDigest: digest, leaseToken: "x".repeat(43), leaseGeneration: 1,
  leaseExpiresAt: new Date(Date.now() + 30_000).toISOString(), payload: { messages: [{ role: "user", content: "Summarise safely" }] } };

test("worker accepts HTTPS control plane only and pins dg-fast digest", () => {
  assert.equal(readConfig({ DG_AI_GATEWAY_URL: "https://digitalgate.example", DG_AI_WORKER_ID: "worker-a", DG_FAST_OLLAMA_DIGEST: digest }).workerId, "worker-a");
  assert.throws(() => readConfig({ DG_AI_GATEWAY_URL: "http://digitalgate.example", DG_AI_WORKER_ID: "worker-a", DG_FAST_OLLAMA_DIGEST: digest }));
});

test("actual worker runtime loads in Node strip-only mode without a listening port", async () => {
  const config = readConfig({ DG_AI_GATEWAY_URL: "https://digitalgate.example", DG_AI_WORKER_ID: "worker-a", DG_FAST_OLLAMA_DIGEST: digest });
  const worker = new MacAiWorker(config, new GatewayClient(config, "dgw_" + "a".repeat(43)));
  worker.stop();
  await worker.run();
});

test("worker independently verifies exact local model name and digest", async () => {
  const fetcher = async () => Response.json({ models: [{ name: OLLAMA_MODEL, digest,
    details: { family: "qwen35", parameter_size: "9B", quantization_level: "Q4_K_M" } }] });
  assert.equal((await assertPinnedModel(digest, undefined, fetcher as typeof fetch))?.name, OLLAMA_MODEL);
  await assert.rejects(assertPinnedModel("b".repeat(64), undefined, fetcher as typeof fetch), { code: "model_identity_mismatch" });
  const aliasFetcher = async () => Response.json({ models: [{ name: "qwen3.5:latest", digest, details: { quantization_level: "Q4_K_M" } }] });
  await assert.rejects(assertPinnedModel(digest, undefined, aliasFetcher as typeof fetch), { code: "model_identity_mismatch" });
});

test("Ollama contract uses the locked dg-fast profile and reports unknown-safe usage", async () => {
  let request: Record<string, unknown> | undefined;
  const fetcher = async (_url: string | URL | Request, init?: RequestInit) => {
    request = JSON.parse(String(init?.body));
    return Response.json({ model: OLLAMA_MODEL, done: true, message: { content: "Safe summary" }, prompt_eval_count: 0, eval_count: null });
  };
  const result = await runOllama(job, new AbortController().signal, fetcher as typeof fetch);
  assert.equal(result.text, "Safe summary");
  assert.equal(result.tokensIn, 0);
  assert.equal(result.tokensOut, null);
  assert.equal(request?.model, "dg-fast:latest");
  assert.equal(request?.stream, false);
  assert.equal(request?.think, false);
  assert.equal(request?.keep_alive, "5m");
  assert.deepEqual(request?.options, { ...OLLAMA_PROFILE, num_predict: 1200 });
});

test("Ollama rejects model substitution and clamps authorised output cap", async () => {
  const wrong = async () => Response.json({ model: "qwen3.5:latest", done: true, message: { content: "x" } });
  await assert.rejects(runOllama(job, new AbortController().signal, wrong as typeof fetch), { code: "invalid_output" });
  await assert.rejects(runOllama({ ...job, maxOutputTokens: 1201 }, new AbortController().signal, wrong as typeof fetch), { code: "invalid_output" });
  assert.equal(new OllamaContractError("invalid_output").code, "invalid_output");
});
