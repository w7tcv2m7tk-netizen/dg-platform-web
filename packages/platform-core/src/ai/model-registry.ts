/**
 * Internal, descriptive Slice 5 registry. Not imported by runtime routing.
 * Availability still comes from configured transports; certification describes
 * repository contracts, not benchmark quality or disclosure/execution approval.
 * policy.ts and tenant recipient approvals remain the only approval authorities.
 */
import { AI_TASK_DEFINITIONS, describeAiDeployments, type AiTask } from "./policy";
import type { LlmProvider } from "./llm";

export type ModelRegistryEntry = Readonly<{
  /** Stable registry key; an upstream alias is not an immutable model revision. */
  modelId: string;
  provider: "openai" | "anthropic";
  model: string;
  transport: LlmProvider;
  upstream: "openai" | "anthropic" | "gateway_managed";
  /** Logical cloud transport/model binding, not a provisioned worker principal. */
  deploymentId: string;
  lane: "cloud_standard";
  capability: "routine";
  lifecycle: "active" | "deprecated" | "retired";
  contracts: readonly Readonly<{
    task: AiTask;
    taskVersion: 1;
    output: "text";
    resultContract: "crm_text_v1";
    /** Certified Gateway execution budgets, not advertised provider maxima. */
    contextBudgetTokens: number;
    maxOutputTokens: number;
  }>[];
  certification: Readonly<{
    kind: "repository_contract";
    evidenceRevision: string;
    evidencePath: string;
    evidenceSymbol: "describeAiDeployments";
    verifiedAt: string;
    reviewBy: string;
  }>;
  /** References only; neither prices nor evaluation claims are invented here. */
  pricingReference?: string;
  evaluationReference?: string;
}>;
export type ModelRegistry = Readonly<{ version: 1; entries: readonly ModelRegistryEntry[] }>;

const EVIDENCE_REVISION = "92bb0851514aae189401c3c6d8c3a98d540b3e52";
const EVIDENCE_PATH = "packages/platform-core/src/ai/policy.ts";
const REVIEW_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;
const identities = [
  { modelId: "openai:gpt-4o-mini", provider: "openai", model: "gpt-4o-mini", transport: "openai", upstream: "openai", deploymentId: "cloud:openai:gpt-4o-mini" },
  { modelId: "openai:gpt-5.4-mini", provider: "openai", model: "openai/gpt-5.4-mini", transport: "gateway", upstream: "gateway_managed", deploymentId: "cloud:gateway:openai/gpt-5.4-mini" },
  { modelId: "anthropic:claude-sonnet-4-20250514", provider: "anthropic", model: "claude-sonnet-4-20250514", transport: "anthropic", upstream: "anthropic", deploymentId: "cloud:anthropic:claude-sonnet-4-20250514" },
] as const;

// Audit verification date and a new, bounded metadata review window. These do
// not claim provider-side model validation, price verification or quality scores.
const certification = Object.freeze({ kind: "repository_contract", evidenceRevision: EVIDENCE_REVISION,
  evidencePath: EVIDENCE_PATH, evidenceSymbol: "describeAiDeployments",
  verifiedAt: "2026-10-09T00:00:00.000Z", reviewBy: "2027-01-07T00:00:00.000Z" } as const);
// Pin the reviewed contract as well as identity. Future policy additions or
// larger budgets must not automatically enlarge this certification snapshot.
const contracts = Object.freeze((["lead_summary", "lead_follow_up"] as const).map((task) =>
  Object.freeze({ task, taskVersion: 1 as const, output: "text" as const,
    resultContract: "crm_text_v1" as const, contextBudgetTokens: 4096, maxOutputTokens: 1200 })));
export const MODEL_REGISTRY: ModelRegistry = Object.freeze({ version: 1,
  entries: Object.freeze(identities.map((identity) => Object.freeze({ ...identity, lane: "cloud_standard" as const,
    capability: "routine" as const, lifecycle: "active" as const, contracts, certification }))) });

export class ModelRegistryError extends Error {
  constructor() { super("Invalid or uncertified model registry entry"); this.name = "ModelRegistryError"; }
}
function reject(): never { throw new ModelRegistryError(); }
function record(value: unknown, required: readonly string[], optional: readonly string[] = []): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return reject();
  const result = value as Record<string, unknown>;
  if (Object.getPrototypeOf(result) !== Object.prototype && Object.getPrototypeOf(result) !== null) return reject();
  if (!required.every((key) => Object.hasOwn(result, key)) ||
      Reflect.ownKeys(result).some((key) => typeof key !== "string" || ![...required, ...optional].includes(key))) return reject();
  return result;
}
function timestamp(value: unknown): number {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return reject();
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) return reject();
  return parsed;
}

/** Explicit time makes validation reproducible; expiry is inclusive and fails closed. */
export function validateModelRegistry(value: unknown, at: string): asserts value is ModelRegistry {
  const now = timestamp(at);
  const registry = record(value, ["version", "entries"]);
  if (registry.version !== 1 || !Array.isArray(registry.entries) || registry.entries.length > identities.length) reject();
  const deployments = new Set<string>();
  const models = new Set<string>();
  for (const raw of Array.from(registry.entries)) {
    const entry = record(raw, ["modelId", "provider", "model", "transport", "upstream", "deploymentId", "lane", "capability", "lifecycle", "contracts", "certification"], ["pricingReference", "evaluationReference"]);
    const identity = identities.find((candidate) => candidate.deploymentId === entry.deploymentId);
    if (!identity || Object.entries(identity).some(([key, expected]) => entry[key] !== expected)) reject();
    if (deployments.has(identity.deploymentId) || models.has(identity.modelId)) reject();
    deployments.add(identity.deploymentId); models.add(identity.modelId);
    // Cross-check the current policy certification without reading credentials or
    // interpreting configured availability as permission to execute.
    const certified = describeAiDeployments([{ provider: identity.transport, model: identity.model }])[0];
    if (!certified || certified.lane !== entry.lane || certified.capability !== entry.capability || certified.upstream !== entry.upstream) reject();
    if (!["active", "deprecated", "retired"].includes(entry.lifecycle as string)) reject();
    for (const key of ["pricingReference", "evaluationReference"]) {
      if (Object.hasOwn(entry, key) && (typeof entry[key] !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_./:#-]{0,199}$/.test(entry[key] as string))) reject();
    }
    const proof = record(entry.certification, ["kind", "evidenceRevision", "evidencePath", "evidenceSymbol", "verifiedAt", "reviewBy"]);
    if (proof.kind !== "repository_contract" || proof.evidenceRevision !== EVIDENCE_REVISION ||
        proof.evidencePath !== EVIDENCE_PATH || proof.evidenceSymbol !== "describeAiDeployments") reject();
    const verified = timestamp(proof.verifiedAt);
    const expires = timestamp(proof.reviewBy);
    // Unreviewed edits cannot renew this snapshot's certification dates.
    if (proof.verifiedAt !== certification.verifiedAt || proof.reviewBy !== certification.reviewBy ||
        verified > now || expires <= now || expires <= verified || expires - verified > REVIEW_WINDOW_MS) reject();
    if (!Array.isArray(entry.contracts) || !entry.contracts.length || entry.contracts.length > 2) reject();
    const tasks = new Set<string>();
    for (const rawContract of Array.from(entry.contracts)) {
      const contract = record(rawContract, ["task", "taskVersion", "output", "resultContract", "contextBudgetTokens", "maxOutputTokens"]);
      const snapshot = contracts.find((candidate) => candidate.task === contract.task);
      if (!snapshot || typeof contract.task !== "string" || !Object.hasOwn(AI_TASK_DEFINITIONS, contract.task) || tasks.has(contract.task)) reject();
      tasks.add(contract.task);
      const definition = AI_TASK_DEFINITIONS[contract.task as AiTask];
      if (contract.taskVersion !== snapshot.taskVersion || contract.taskVersion !== definition.version ||
          contract.output !== snapshot.output || contract.output !== definition.requirements.output ||
          contract.resultContract !== snapshot.resultContract || contract.resultContract !== definition.resultContract || !Number.isSafeInteger(contract.contextBudgetTokens) ||
          (contract.contextBudgetTokens as number) < 1 || (contract.contextBudgetTokens as number) > Math.min(snapshot.contextBudgetTokens, definition.requirements.contextBudgetTokens) ||
          !Number.isSafeInteger(contract.maxOutputTokens) || (contract.maxOutputTokens as number) < 1 ||
          (contract.maxOutputTokens as number) > Math.min(snapshot.maxOutputTokens, definition.maxOutputTokens)) reject();
    }
  }
}

/** Certification lookup only. A match grants no availability or execution approval. */
export function findCertifiedModelDeployment(registry: unknown, target: {
  deploymentId: string; transport: LlmProvider; model: string; lane: string; task: AiTask;
}, at: string): ModelRegistryEntry {
  validateModelRegistry(registry, at);
  const entry = registry.entries.find((candidate) => candidate.deploymentId === target.deploymentId &&
    candidate.transport === target.transport && candidate.model === target.model && candidate.lane === target.lane &&
    candidate.lifecycle === "active" && candidate.contracts.some((contract) => contract.task === target.task));
  if (!entry) return reject();
  return entry;
}
