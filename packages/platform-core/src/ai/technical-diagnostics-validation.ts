import { createHash } from "node:crypto";

/** Pure wire contracts only. No task registration, authorisation, collection or execution. */
export const DIAGNOSTIC_V1_LIMITS = Object.freeze({
  inputBytes: 32_768, outputBytes: 32_768, textBytes: 2_048,
  evidence: 16, findings: 10, recommendations: 10, verificationSteps: 10,
  totalVerificationSteps: 40, limitations: 16, missingEvidence: 16,
  freshnessMs: 86_400_000, submissionLifetimeMs: 300_000,
  jsonDepth: 16, jsonNodes: 4_096,
});
export type DiagnosticEvidenceKind = "repository_excerpt" | "build_report" | "test_report" |
  "deployment_metadata" | "configuration_names" | "platform_health" | "platform_error";
export type DiagnosticClassification = "platform_internal" | "restricted";
export type DiagnosticEvidenceV1 = {
  id: string;
  kind: DiagnosticEvidenceKind;
  scope: "digitalgate_platform";
  classification: DiagnosticClassification;
  contentType: "text/plain";
  content: string;
  contentSha256: string;
  provenance: { sourceRef: string; revision: string; capturedAt: string; sanitisationVersion: 1 };
};
/** This content bundle is a component of the future server envelope, not proof of authority. */
export type DiagnosticInputV1 = {
  contract: "technical_diagnostics_v1";
  schemaVersion: 1;
  taskVersion: 1;
  scope: "digitalgate_platform";
  classification: DiagnosticClassification;
  requestId: string;
  question: string;
  diagnosticCategory: "build" | "test" | "deployment" | "configuration" | "health" | "code_review";
  createdAt: string;
  expiresAt: string;
  evidence: DiagnosticEvidenceV1[];
  bundleSha256: string;
};
/** Half-open offsets are UTF-16 code units in the exact submitted, sanitised content. */
export type DiagnosticEvidenceReferenceV1 = { evidenceId: string; start: number; end: number; quote: string };
export type DiagnosticFindingV1 = {
  id: string;
  severity: "info" | "warning" | "critical";
  observation: string;
  hypothesis: string;
  confidence: "low" | "medium" | "high";
  evidenceReferences: DiagnosticEvidenceReferenceV1[];
};
export type DiagnosticRecommendationV1 = {
  findingIds: string[];
  proposedAction: string;
  rationale: string;
  risk: string;
  verificationSteps: string[];
  rollbackConsiderations: string;
  requiresHumanReview: true;
};
/** Model-authored content only; future server-attested execution provenance is separate. */
export type DiagnosticOutputV1 = {
  contract: "technical_diagnostics_v1";
  schemaVersion: 1;
  taskVersion: 1;
  requestId: string;
  envelopeDigest: string;
  status: "recommendations" | "insufficient_evidence" | "unable_to_assess";
  summary: string;
  findings: DiagnosticFindingV1[];
  recommendations: DiagnosticRecommendationV1[];
  limitations: string[];
  missingEvidence: string[];
};
export type DiagnosticValidationCode = "invalid_json" | "duplicate_key" | "size_exceeded" |
  "invalid_shape" | "unknown_field" | "invalid_value" | "invalid_text" | "unsafe_content" |
  "invalid_timestamp" | "stale_timestamp" | "duplicate_id" | "hash_mismatch" |
  "classification_mismatch" | "unresolved_reference" | "invalid_locator" | "binding_mismatch";
export type DiagnosticValidationResult<T> = { ok: true; value: T } |
  { ok: false; error: { code: DiagnosticValidationCode; path: string } };

class Invalid extends Error {
  readonly code: DiagnosticValidationCode;
  readonly path: string;
  constructor(code: DiagnosticValidationCode, path: string) {
    super("Invalid diagnostic content"); this.code = code; this.path = path;
  }
}
function fail(code: DiagnosticValidationCode, path: string): never { throw new Invalid(code, path); }
const bytes = (s: string) => Buffer.byteLength(s, "utf8");
const hash = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

/** Sorted ASCII schema keys, original array order and strings; no Unicode/text normalisation. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/** Bounded JSON parser: JSON.parse alone silently accepts duplicate object keys. */
function parse(raw: unknown, maxBytes: number, path: string): unknown {
  if (typeof raw !== "string") fail("invalid_json", path);
  if (bytes(raw) > maxBytes) fail("size_exceeded", path);
  let at = 0;
  let nodes = 0;
  const whitespace = () => { while (/[\x20\t\r\n]/.test(raw[at] ?? "X")) at++; };
  const string = (): string => {
    const start = at++;
    while (at < raw.length) {
      const c = raw[at++];
      if (c === "\\") { at++; continue; }
      if (c === '"') {
        try { return JSON.parse(raw.slice(start, at)) as string; } catch { fail("invalid_json", path); }
      }
    }
    return fail("invalid_json", path);
  };
  const read = (depth: number): unknown => {
    if (++nodes > DIAGNOSTIC_V1_LIMITS.jsonNodes || depth > DIAGNOSTIC_V1_LIMITS.jsonDepth) fail("size_exceeded", path);
    whitespace();
    const c = raw[at];
    if (c === '"') return string();
    if (c === "{" || c === "[") {
      at++; whitespace();
      const array = c === "[";
      const end = array ? "]" : "}";
      const values: unknown[] = [];
      const record: Record<string, unknown> = Object.create(null);
      const keys = new Set<string>();
      if (raw[at] === end) { at++; return array ? values : record; }
      while (at < raw.length) {
        if (array) values.push(read(depth + 1));
        else {
          whitespace();
          if (raw[at] !== '"') fail("invalid_json", path);
          const key = string();
          if (keys.has(key)) fail("duplicate_key", path);
          keys.add(key); whitespace();
          if (raw[at++] !== ":") fail("invalid_json", path);
          record[key] = read(depth + 1);
        }
        whitespace();
        if (raw[at] === end) { at++; return array ? values : record; }
        if (raw[at++] !== ",") fail("invalid_json", path);
      }
      return fail("invalid_json", path);
    }
    const token = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(raw.slice(at));
    if (!token) fail("invalid_json", path);
    at += token[0].length;
    const value: unknown = JSON.parse(token[0]);
    if (typeof value === "number" && !Number.isFinite(value)) fail("invalid_value", path);
    return value;
  };
  const value = read(0); whitespace();
  if (at !== raw.length) fail("invalid_json", path);
  return value;
}
function object(value: unknown, fields: readonly string[], path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("invalid_shape", path);
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !fields.includes(key))) fail("unknown_field", path);
  if (fields.some((key) => !Object.hasOwn(record, key))) fail("invalid_shape", path);
  return record;
}
function oneOf<T extends string | number | boolean>(value: unknown, options: readonly T[], path: string): asserts value is T {
  if (!options.includes(value as T)) fail("invalid_value", path);
}
function text(value: unknown, path: string, max: number = DIAGNOSTIC_V1_LIMITS.textBytes): asserts value is string {
  if (typeof value !== "string" || !value.trim()) fail("invalid_text", path);
  if (bytes(value) > max) fail("size_exceeded", path);
  // Permit tab/LF only. Reject bidi/format controls and malformed UTF-16 rather than normalising.
  if (/[\p{Cc}\p{Cf}]/u.test(value.replace(/[\t\n]/g, "")) || /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value)) fail("invalid_text", path);
}
function id(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string" || !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(value)) fail("invalid_value", path);
}
function digest(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) fail("invalid_value", path);
}
function list(value: unknown, max: number, path: string, min = 0): unknown[] {
  if (!Array.isArray(value)) fail("invalid_shape", path);
  if (value.length > max) fail("size_exceeded", path);
  if (value.length < min) fail("invalid_value", path);
  return value;
}
function timestamp(value: unknown, path: string): number {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) fail("invalid_timestamp", path);
  const ms = Date.parse(value);
  if (!Number.isFinite(ms) || new Date(ms).toISOString() !== value) fail("invalid_timestamp", path);
  return ms;
}
function clock(nowMs: number): void {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0 || nowMs > 8_640_000_000_000_000) fail("invalid_timestamp", "$clock");
}

// Rejection heuristics, NOT a sanitiser, semantic classifier or prompt-injection security boundary.
// Benign code/text is allowed, but recognised instructions, secrets and active payloads fail closed.
const unsafePatterns = [
  /(?:ignore|disregard|override|forget)\s+(?:(?:all|any|the|your)\s+)*(?:previous|prior|system|developer|safety)\s+(?:instructions?|prompts?|rules?)/i,
  /(?:system|developer|assistant)\s*(?:message|prompt|role)\s*:|<\|(?:im_start|im_end|system|assistant)|\[INST\]|<<SYS>>/i,
  /(?:reveal|print|exfiltrate|upload|send)\s+(?:(?:all|the|your)\s+)*(?:secrets?|credentials?|tokens?|passwords?|customer\s+(?:records|data))/i,
  /\b(?:tool_call|function_call|execute_command)\b|```|#!\s*\/|\$\(|`/i,
  /<\s*\/?\s*(?:script|iframe|object|embed|svg|img|a|form)\b|\b(?:javascript|vbscript|data)\s*:|\bon\w+\s*=/i,
  /(?:^|[\n;&|])\s*(?:sudo\s+)?(?:rm|curl|wget|bash|sh|zsh|eval|exec|osascript|powershell|pwsh|chmod|chown|launchctl)\b/i,
  /\b(?:curl|wget)\b[^\n]*(?:\||--data|-d\s)|\b(?:powershell|pwsh)\b[^\n]*-(?:enc|encodedcommand)\b/i,
  /\b(?:npm|npx|pnpm|yarn)\s+(?:exec|run|install|add|dlx|prisma|vercel)\b|\bgit\s+(?:push|reset|clean)\b|\bvercel\s+(?:deploy|promote|env)\b/i,
  /\b(?:DROP|TRUNCATE|ALTER)\s+(?:TABLE|DATABASE|SCHEMA)\b|\bDELETE\s+FROM\b|\bINSERT\s+INTO\b|\bUPDATE\s+\w+\s+SET\b/i,
  /-----BEGIN [^-]*(?:PRIVATE KEY|CERTIFICATE)-----|\b(?:sk-[A-Za-z0-9_-]{8,}|AKIA[A-Z0-9]{16})\b/i,
  /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?)\s*:\/\/|\bBearer\s+[A-Za-z0-9_.-]+/i,
  /\b(?:password|passwd|secret|api[_-]?key|access[_-]?token|database_url)\s*[:=]\s*\S+/i,
  /\b[A-Z][A-Z0-9_]{2,}\s*=\s*\S+/,
  /\b[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+\b/,
  /\b(?:customer|tenant|crm)\s*(?:record|data|content|id|email|phone)\s*[:=]/i,
];
function safeText(value: unknown, path: string): asserts value is string {
  text(value, path);
  // Inspect a normalised copy for common compatibility-character bypasses; never alter accepted content.
  if (unsafePatterns.some((pattern) => pattern.test(value.normalize("NFKC")))) fail("unsafe_content", path);
}
function sourceRef(kind: DiagnosticEvidenceKind, value: unknown, path: string): void {
  text(value, path, 256);
  if (kind === "repository_excerpt") {
    if (!/^(?:src|packages|workers|scripts|docs)\/(?:[A-Za-z0-9_@()[\].-]+\/)*[A-Za-z0-9_@()[\].-]+$/.test(value) ||
      value.split("/").some((part) => part === "." || part === ".." || part.startsWith(".")) ||
      /(?:credential|secret|customer|tenant-record|\.pem$|\.key$)/i.test(value)) fail("invalid_value", path);
  } else {
    const prefixes: Record<Exclude<DiagnosticEvidenceKind, "repository_excerpt">, string> = {
      build_report: "build", test_report: "test", deployment_metadata: "deployment",
      configuration_names: "config", platform_health: "health", platform_error: "error",
    };
    if (!new RegExp(`^${prefixes[kind]}:[A-Za-z][A-Za-z0-9_-]{0,63}$`).test(value)) fail("invalid_value", path);
  }
}
function validateInput(raw: unknown, nowMs: number): DiagnosticInputV1 {
  clock(nowMs);
  const root = object(parse(raw, DIAGNOSTIC_V1_LIMITS.inputBytes, "$input"), [
    "contract", "schemaVersion", "taskVersion", "scope", "classification", "requestId", "question",
    "diagnosticCategory", "createdAt", "expiresAt", "evidence", "bundleSha256",
  ], "$input");
  oneOf(root.contract, ["technical_diagnostics_v1"], "$input.contract");
  oneOf(root.schemaVersion, [1], "$input.schemaVersion");
  oneOf(root.taskVersion, [1], "$input.taskVersion");
  oneOf(root.scope, ["digitalgate_platform"], "$input.scope");
  oneOf(root.classification, ["platform_internal", "restricted"], "$input.classification");
  id(root.requestId, "$input.requestId"); safeText(root.question, "$input.question");
  oneOf(root.diagnosticCategory, ["build", "test", "deployment", "configuration", "health", "code_review"], "$input.diagnosticCategory");
  const created = timestamp(root.createdAt, "$input.createdAt");
  const expires = timestamp(root.expiresAt, "$input.expiresAt");
  if (created > nowMs || expires <= created || expires - created > DIAGNOSTIC_V1_LIMITS.submissionLifetimeMs) fail("invalid_timestamp", "$input.createdAt");
  if (expires <= nowMs) fail("stale_timestamp", "$input.expiresAt");
  const ids = new Set<string>();
  list(root.evidence, DIAGNOSTIC_V1_LIMITS.evidence, "$input.evidence").forEach((item, index) => {
    const path = `$input.evidence[${index}]`;
    const e = object(item, ["id", "kind", "scope", "classification", "contentType", "content", "contentSha256", "provenance"], path);
    id(e.id, `${path}.id`);
    if (ids.has(e.id)) fail("duplicate_id", `${path}.id`);
    ids.add(e.id);
    oneOf(e.kind, ["repository_excerpt", "build_report", "test_report", "deployment_metadata", "configuration_names", "platform_health", "platform_error"], `${path}.kind`);
    oneOf(e.scope, ["digitalgate_platform"], `${path}.scope`);
    oneOf(e.classification, ["platform_internal", "restricted"], `${path}.classification`);
    if (e.classification === "restricted" && root.classification !== "restricted") fail("classification_mismatch", `${path}.classification`);
    oneOf(e.contentType, ["text/plain"], `${path}.contentType`);
    safeText(e.content, `${path}.content`); digest(e.contentSha256, `${path}.contentSha256`);
    if (hash(e.content) !== e.contentSha256) fail("hash_mismatch", `${path}.contentSha256`);
    const p = object(e.provenance, ["sourceRef", "revision", "capturedAt", "sanitisationVersion"], `${path}.provenance`);
    sourceRef(e.kind, p.sourceRef, `${path}.provenance.sourceRef`);
    if (typeof p.revision !== "string" || !(e.kind === "repository_excerpt" ? /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/ : /^[a-f0-9]{64}$/).test(p.revision)) fail("invalid_value", `${path}.provenance.revision`);
    oneOf(p.sanitisationVersion, [1], `${path}.provenance.sanitisationVersion`);
    const captured = timestamp(p.capturedAt, `${path}.provenance.capturedAt`);
    if (captured > created) fail("invalid_timestamp", `${path}.provenance.capturedAt`);
    if (nowMs - captured > DIAGNOSTIC_V1_LIMITS.freshnessMs) fail("stale_timestamp", `${path}.provenance.capturedAt`);
  });
  digest(root.bundleSha256, "$input.bundleSha256");
  const bundle = { ...root }; delete bundle.bundleSha256;
  if (hash(canonical(bundle)) !== root.bundleSha256) fail("hash_mismatch", "$input.bundleSha256");
  return root as DiagnosticInputV1;
}
function validateOutput(raw: unknown, input: DiagnosticInputV1): DiagnosticOutputV1 {
  const root = object(parse(raw, DIAGNOSTIC_V1_LIMITS.outputBytes, "$output"), [
    "contract", "schemaVersion", "taskVersion", "requestId", "envelopeDigest", "status", "summary",
    "findings", "recommendations", "limitations", "missingEvidence",
  ], "$output");
  oneOf(root.contract, ["technical_diagnostics_v1"], "$output.contract");
  oneOf(root.schemaVersion, [1], "$output.schemaVersion");
  oneOf(root.taskVersion, [1], "$output.taskVersion");
  if (root.requestId !== input.requestId || root.envelopeDigest !== input.bundleSha256) fail("binding_mismatch", "$output");
  oneOf(root.status, ["recommendations", "insufficient_evidence", "unable_to_assess"], "$output.status");
  safeText(root.summary, "$output.summary");
  const evidence = new Map(input.evidence.map((e) => [e.id, e]));
  const ids = new Set<string>();
  const findings = list(root.findings, DIAGNOSTIC_V1_LIMITS.findings, "$output.findings");
  findings.forEach((item, index) => {
    const path = `$output.findings[${index}]`;
    const f = object(item, ["id", "severity", "observation", "hypothesis", "confidence", "evidenceReferences"], path);
    id(f.id, `${path}.id`);
    if (ids.has(f.id)) fail("duplicate_id", `${path}.id`);
    ids.add(f.id);
    oneOf(f.severity, ["info", "warning", "critical"], `${path}.severity`);
    oneOf(f.confidence, ["low", "medium", "high"], `${path}.confidence`);
    for (const key of ["observation", "hypothesis"]) safeText(f[key], `${path}.${key}`);
    const locators = new Set<string>();
    list(f.evidenceReferences, DIAGNOSTIC_V1_LIMITS.evidence, `${path}.evidenceReferences`, 1).forEach((item, n) => {
      const refPath = `${path}.evidenceReferences[${n}]`;
      const ref = object(item, ["evidenceId", "start", "end", "quote"], refPath);
      id(ref.evidenceId, `${refPath}.evidenceId`);
      const e = evidence.get(ref.evidenceId);
      if (!e) fail("unresolved_reference", refPath);
      safeText(ref.quote, `${refPath}.quote`);
      if (typeof ref.start !== "number" || typeof ref.end !== "number" || !Number.isSafeInteger(ref.start) ||
          !Number.isSafeInteger(ref.end) || ref.start < 0 || ref.end <= ref.start || ref.end > e.content.length ||
          e.content.slice(ref.start, ref.end) !== ref.quote) fail("invalid_locator", refPath);
      const key = `${ref.evidenceId}:${ref.start}:${ref.end}`;
      if (locators.has(key)) fail("duplicate_id", refPath);
      locators.add(key);
    });
  });
  let totalSteps = 0;
  const recommendations = list(root.recommendations, DIAGNOSTIC_V1_LIMITS.recommendations, "$output.recommendations");
  recommendations.forEach((item, index) => {
    const path = `$output.recommendations[${index}]`;
    const r = object(item, ["findingIds", "proposedAction", "rationale", "risk", "verificationSteps", "rollbackConsiderations", "requiresHumanReview"], path);
    const seen = new Set<string>();
    list(r.findingIds, DIAGNOSTIC_V1_LIMITS.findings, `${path}.findingIds`, 1).forEach((value) => {
      id(value, `${path}.findingIds`);
      if (!ids.has(value)) fail("unresolved_reference", `${path}.findingIds`);
      if (seen.has(value)) fail("duplicate_id", `${path}.findingIds`);
      seen.add(value);
    });
    for (const key of ["proposedAction", "rationale", "risk", "rollbackConsiderations"]) safeText(r[key], `${path}.${key}`);
    oneOf(r.requiresHumanReview, [true], `${path}.requiresHumanReview`);
    const steps = list(r.verificationSteps, DIAGNOSTIC_V1_LIMITS.verificationSteps, `${path}.verificationSteps`, 1);
    totalSteps += steps.length;
    if (totalSteps > DIAGNOSTIC_V1_LIMITS.totalVerificationSteps) fail("size_exceeded", "$output.recommendations");
    steps.forEach((step, n) => safeText(step, `${path}.verificationSteps[${n}]`));
  });
  const limitations = list(root.limitations, DIAGNOSTIC_V1_LIMITS.limitations, "$output.limitations");
  const missing = list(root.missingEvidence, DIAGNOSTIC_V1_LIMITS.missingEvidence, "$output.missingEvidence");
  limitations.forEach((value, n) => safeText(value, `$output.limitations[${n}]`));
  missing.forEach((value, n) => safeText(value, `$output.missingEvidence[${n}]`));
  if (root.status === "recommendations" && (!recommendations.length || !findings.length)) fail("invalid_value", "$output.status");
  if (root.status !== "recommendations" && (recommendations.length || !limitations.length)) fail("invalid_value", "$output.status");
  if (root.status === "insufficient_evidence" && !missing.length) fail("invalid_value", "$output.missingEvidence");
  return root as DiagnosticOutputV1;
}
function result<T>(validate: () => T): DiagnosticValidationResult<T> {
  try { return { ok: true, value: validate() }; }
  catch (error) {
    if (error instanceof Invalid) return { ok: false, error: { code: error.code, path: error.path } };
    throw error;
  }
}
/** Raw JSON only: reject duplicate keys before they can be collapsed by JSON.parse. */
export function validateDiagnosticInputV1(raw: unknown, nowMs: number): DiagnosticValidationResult<DiagnosticInputV1> {
  return result(() => validateInput(raw, nowMs));
}
/** Revalidate the original submission at the same explicit clock; never trust a caller-cast object. */
export function validateDiagnosticOutputV1(raw: unknown, submittedInputJson: unknown, nowMs: number): DiagnosticValidationResult<DiagnosticOutputV1> {
  return result(() => validateOutput(raw, validateInput(submittedInputJson, nowMs)));
}
