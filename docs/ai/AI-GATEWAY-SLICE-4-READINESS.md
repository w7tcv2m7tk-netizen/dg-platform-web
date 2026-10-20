# Slice 4 readiness: DigitalGate Technical Diagnostics

Dated: **2026-10-09 (Australia/Brisbane)**. Status: **approved for documentation only**. This is PR 1's readiness contract, not implementation or operational activation authority. Detailed fields and numerical limits below are proposed implementation requirements; they must be confirmed at the implementation design gate. No specialist capability is available through this document.

## Initial capability and authority

`technical_diagnostics` v1 produces structured, evidence-backed recommendations about the DigitalGate platform. Only an authenticated, currently authorised **platform operator** may submit, cancel or read a diagnostic. Tenant owner/admin status, customer sessions, API keys, cron credentials and worker credentials do not confer this authority. Worker credentials authorise only their bounded machine protocol.

Evidence is limited to explicitly selected, sanitised DigitalGate platform technical material: repository excerpts, build/test reports, deployment metadata, allowlisted configuration names and redacted platform health/error summaries. No customer tenant records, CRM evidence, customer content, personal data, credentials, environment values, database connection strings or unrestricted logs are admissible. Platform-operator status does not waive this exclusion. Evidence collection must not become an arbitrary URL fetch, filesystem reader, database query or shell interface.

Inference uses only an explicitly approved local specialist deployment (`local_specialist`, intended alias `dg-coder`). Cloud disclosure and cloud fallback are prohibited, as are substitution with `dg-fast`, automatic escalation and model-selected recipients. Local-only describes inference: the existing cloud control plane may authenticate, store encrypted jobs and mediate HTTPS delivery. Failure returns a bounded failure or insufficient-evidence outcome; it never calls a cloud model.

Results are advice. Human review is required before **every** operational action. A diagnostic cannot invoke tools, execute suggested commands, mutate files or records, remediate infrastructure, apply migrations, deploy, provision workers or change permissions. Review does not itself authorise those operations: each uses its existing approval process. No customer UI, Advisor or Support Aida integration is included.

## Proposed evidence envelope v1

The server constructs and validates an immutable envelope, rather than accepting caller-authored authority or a free-form system prompt:

| Field | Required meaning |
| --- | --- |
| `envelopeVersion`, `task`, `taskVersion` | `1`, `technical_diagnostics`, `1` |
| `requestId`, `correlationId`, `idempotencyKey` | Bounded identifiers; reuse with different content is a conflict |
| `scope` | Explicit `digitalgate_platform`; never a tenant masquerading as platform scope |
| `requestedBy`, `authorisationVersion`, `authorisedAt` | Server-derived operator identity and authority snapshot; checked again at disclosure/read |
| `question`, `diagnosticCategory` | Bounded diagnostic objective and allowlisted category; no executable instructions |
| `evidence[]` | Unique ID, allowlisted source kind, repository path/report reference, immutable revision or digest, capture time, classification, sanitisation version and bounded text excerpt |
| `policy` | Versioned, server-derived local-required disclosure; no approved cloud recipients, fallback or escalation |
| `deployment` | Approved deployment ID, model digest, profile version and contract versions; server selected |
| `createdAt`, `expiresAt` | Server times and absolute validity bound |

Classify at least `platform_internal`; intersect source restrictions without downgrading them. Secret-bearing or customer-bearing evidence is rejected, not merely relabelled `restricted`. Unknown fields, source kinds, versions, duplicate evidence IDs, invalid hashes/times and out-of-scope references fail closed. Sanitise before enqueue; preserve sanitisation provenance without persisting discarded sensitive originals. Source content is untrusted data, including instructions embedded in comments, logs or reports. Citations refer only to supplied evidence IDs and exact supplied excerpts; a digest establishes identity, not truth. Missing, stale or conflicting evidence must be visible in the result.

## Proposed structured result v1

Contract name: `technical_diagnostics_v1`. Validate strict JSON on the worker and authoritatively on completion; never accept Markdown as a substitute for the schema.

| Field | Required meaning |
| --- | --- |
| `schemaVersion`, `taskVersion`, `requestId`, `envelopeDigest` | Bind result to v1 and the exact submitted envelope |
| `status` | `recommendations`, `insufficient_evidence` or `unable_to_assess` |
| `summary` | Concise bounded diagnostic assessment |
| `findings[]` | Unique finding ID, severity (`info`, `warning`, `critical`), observation, hypothesis, confidence (`low`, `medium`, `high`), evidence references |
| `recommendations[]` | Finding references, proposed action, rationale, risk, validation steps, rollback considerations, `requiresHumanReview: true` |
| `limitations[]`, `missingEvidence[]` | Explicit uncertainty, contradictions, freshness limits and bounded requests for additional evidence |
| `provenance` | Server-attested deployment/model digest/profile, task/policy/schema versions and timestamps; model assertions cannot establish execution identity |

Each factual finding must cite supplied evidence; each recommendation must link to a supported finding. Validate reference integrity and excerpt bounds. Unsupported claims are rejected or represented as uncertainty, never promoted to verified facts. A structurally valid recommendation is still not proof of correctness. Unknown fields, invalid enums, non-finite values, excess arrays, missing review flags, forged provenance and foreign citations reject the completion. Execution failures are protocol outcomes, not fabricated diagnostic findings. Render all text as untrusted content; suggested commands remain inert text.

## Proposed resource and lifecycle requirements

These ceilings deliberately do not inherit permission to tune Slice 3's locked profile. Hardware measurements and the chosen specialist tokenizer/profile must confirm them before implementation approval; increases require explicit review.

| Resource | Proposed v1 ceiling |
| --- | --- |
| Envelope | 32 KiB UTF-8 total; 16 evidence items; 2 KiB per excerpt; question 2 KiB |
| Context | 8,192 tokens including framing and reserved output; conservative admission estimate plus model-specific verification; no silent truncation |
| Output | 2,048 generated tokens and 32 KiB encoded result; 10 findings, 10 recommendations, 16 limitations and 16 missing-evidence items; individual text field 2 KiB |
| Execution | One inference at a time per machine across routine/specialist lanes; no parallel model loading |
| Time | 12-second submission budget; five-minute absolute job expiry; 120-second inference deadline; 30-second lease; heartbeat every 10 seconds |
| Attempts | One inference attempt; no automatic model transition, fallback or retry after ambiguous execution |
| Transport | Bounded request/response allocation, HTTPS control plane, redirect rejection, loopback-only Ollama; no external inference/tool network access |

Apply aggregate limits as well as individual limits. Reject over-budget input before disclosure. Abort inference on cancellation, lost authority, missed heartbeat, deadline, lease loss or model mismatch; late results cannot commit. A heartbeat cannot extend the absolute deadline/expiry. Admission and scheduling must prevent starvation or disruption of routine jobs; scheduling policy and hardware memory/residency budgets remain design decisions.

Retain Slice 3's queued → leased → terminal lifecycle, generation/sequence fencing, hashed lease tokens, worker/deployment/approval checks, cancellation races, database wall-clock expiry checks and atomic result/accounting-outbox commit. No transaction spans inference. Identical completion replay may acknowledge the existing receipt only with the same operation/content/worker/token/generation and current authority; changed bodies or old generations fail. Recovery cannot resurrect cancelled, revoked or expired authority. Model transitions never repoint an already queued or leased job.

Encrypt payload and results at rest with versioned authenticated encryption and associated data binding job, platform scope, task/version, policy, deployment and content kind. The cloud encryption key never goes to the Mac. Proposed retention: purge input ciphertext within one hour of terminal state, result ciphertext within seven days, minimal non-content job/accounting metadata within 90 days. Purge must also cover failed/cancelled jobs and derived copies; logs contain identifiers and bounded error codes, never evidence, prompts or responses. No durable local prompt/result caches; release process memory and unload according to the approved profile. Backup expiry and restore-time re-purge must be specified and tested before activation. Security provisioning receipts retain their existing independent retention rules; these content limits must not clear replay/budget state or historical reconciliation evidence.

Revocation of the operator's authority, platform recipient approval, worker or deployment blocks new disclosure, heartbeat, completion and result access, with transactional fencing against concurrent completion. Cancellation requests stop further processing; worker abort is best effort. Revocation cannot recall plaintext already disclosed to a leased worker or a result already seen by an operator. Test this limitation explicitly and minimise residual local data. No promises of instantaneous memory erasure or recall from backups.

## Specialist identity, transition and rollback

`dg-coder` is an intended alias, not an approved model identity. Before implementation/installation approval, specify upstream model and revision, licence, artifact source and digest, architecture/family, parameter size, quantisation, tokenizer/template, runtime version, context/output limits and immutable generation profile. No digest is invented here. Alias presence or a successful response is insufficient verification.

Verify tag/digest and metadata at startup and before each inference; bind the verified deployment/profile to the lease and completion provenance. Recheck after unload/reload or runtime restart. Missing, changed, duplicate or incompatible metadata fails closed. Model verification is distinct from synthetic capability acceptance and human quality review; all are required.

A transition requires its own reviewed manifest, acceptance evidence, hardware budget and operational approval. Pause admission, drain or explicitly cancel old leases, verify unload/load and identity, then enable the new deployment only through authorised controls. Preserve in-flight identity and job history. Do not change the Slice 3 pinned deployment or its signed provisioning identity/window to accommodate a specialist. Existing provisioning is purpose-built for `dg-mac-1` / `dg-fast:latest` / `local_routine` and cannot authorise `dg-coder`.

Rollback first disables specialist admission and fences its outstanding authority. Restore only a previously approved, verified manifest after separate authorisation and smoke verification. Never rollback to a different digest under the same active deployment ID or route specialist work to the routine/cloud lane. Schema changes must be additive and preserve historical receipts; rollback must not remove security constraints or reactivate retired reconciliation mechanisms.

## Complete synthetic acceptance matrix

All cases below are mandatory future gates, using synthetic platform evidence and owned disposable databases. This PR specifies tests; it neither implements nor claims to have run them. Exercise both application validation and physical database fencing where applicable, including both race orderings. No production records or credentials are fixtures.

| ID | Synthetic case | Required result |
| --- | --- | --- |
| A01 | Current platform operator, approved specialist, valid evidence | Structured cited advice only; no side effects |
| A02 | Unauthenticated caller; tenant owner/admin; customer; API key; cron; worker bearer at operator interface | Each denied before evidence access/enqueue |
| A03 | Operator revoked before enqueue, claim, heartbeat, completion or read | Each boundary fails closed |
| A04 | Foreign operator/job identifiers and scope substitution | No cross-scope disclosure or existence leak |
| A05 | Customer tenant/CRM records or personal data mixed into platform evidence | Reject entire submission |
| A06 | Secrets, environment values, connection strings or raw unrestricted logs | Reject; no sensitive persistence/logging |
| A07 | Allowlisted sanitised repository/build/health evidence | Accept with provenance and classification floor |
| A08 | Unknown source/version/field; duplicate ID; malformed digest/time | Reject each malformed envelope |
| A09 | Evidence containing prompt injection/tool requests | Treat as data; no authority expansion or tool execution |
| A10 | Empty, stale, incomplete or contradictory evidence | Explicit uncertainty/insufficient evidence; no invented facts |
| A11 | Caller requests cloud/fallback/escalation/routine substitution | Deny; zero cloud/routine inference calls |
| A12 | Specialist absent/offline or verification fails | Bounded unavailable outcome; no fallback |
| A13 | Correct alias with wrong digest/family/quantisation/profile; duplicate tag | Reject each mismatch before inference |
| A14 | Model changes after startup or across reload/restart | Reverification fails; no accepted misidentified result |
| A15 | Envelope/item/question/context exactly at limit and one unit over | Boundary accepts when aggregate fits; overage rejects without truncation |
| A16 | Output bytes/tokens/arrays/text over limits; streaming/redirect/oversized transport response | Abort/reject; bounded allocation |
| A17 | Valid JSON with all evidence/finding references and review flags | Accept atomically, render inertly |
| A18 | Invalid JSON/schema/enum; unknown fields; absent review flag; forged provenance | Reject each completion |
| A19 | Missing/foreign citation, unsupported factual claim or invalid excerpt | Reject unsupported output; no success receipt |
| A20 | Recommendations contain commands, HTML or operational instructions | Inert safe display; no execution or mutation |
| A21 | Concurrent claims across specialist and routine work | One inference per machine; no duplicate live lease or model overlap |
| A22 | Wrong worker/token/deployment/generation or heartbeat sequence | Deny; no lease extension or result write |
| A23 | Lease/deadline/expiry crossed during lock wait or completion commit | Cannot resurrect/commit expired work |
| A24 | Worker death, missed heartbeat, timeout and ambiguous result | Terminal bounded outcome; no automatic second inference |
| A25 | Cancel versus claim/heartbeat/completion, both race orderings | Fenced result; no post-cancellation disclosure/commit |
| A26 | Operator/approval/worker/deployment revocation versus completion, both orderings | Authority locks enforce valid commit ordering |
| A27 | Identical concurrent submission/completion replay | One job/result/outbox event; safe acknowledgement only |
| A28 | Same idempotency/operation ID with changed body or prior generation | Conflict/reject; no duplicate accounting |
| A29 | Result or outbox transaction failure | Both roll back; no partial success |
| A30 | Ciphertext inspected; associated data/key/version tampered | No plaintext at rest; tampering fails closed |
| A31 | Terminal input/result/metadata retention deadlines including failure/cancel | Purge each class on schedule; no content in logs/cache |
| A32 | Backup restored after purge deadline | Re-purge before access; preserve independent security receipts |
| A33 | Revocation after plaintext disclosure | Stop further access/processing; record recall limitation accurately |
| A34 | Model transition with queued/leased jobs | Drain/cancel; no identity repointing or mixed-profile completion |
| A35 | Failed transition and rollback | Specialist stays disabled until approved old identity is verified |
| A36 | Missing/malformed activation configuration or provisioning attempt using routine boundary | Refuse specialist activation/provisioning |
| A37 | Existing Slice 1–3 and exact-observation regressions | Existing disclosure, tenant isolation, locked routine profile and exact target semantics unchanged |
| A38 | Retired reconciliation routes and disabled physical remediation | No reintroduced route, flag, fixture import or control change |
| A39 | Human reviews advice without separately authorising an operation | No automatic action, deploy, migration or worker activation |

## Required extensions to existing contracts

Review against the repository on 2026-10-09 identifies these future changes; none is implemented here:

- [Policy](../../packages/platform-core/src/ai/policy.ts): tasks currently comprise only `lead_summary` and `lead_follow_up`; evidence is organisation-scoped CRM/business context, output is `crm_text_v1`, and specialist routing is explicitly rejected. Add a separately versioned platform task/envelope and strict structured validator without widening CRM disclosure or exact observations. Resolve platform scope explicitly rather than using a customer organisation ID as a shortcut.
- [Persistence and leases](../../packages/platform-core/src/ai/local-jobs.ts), [encryption](../../packages/platform-core/src/ai/local-crypto.ts) and [Prisma schema](../../packages/database/prisma/schema.prisma): extend task/lane/output/scope constraints, approval relations, associated data, retention and authority fencing through reviewed additive migrations. Keep terminal immutability, idempotency receipts and atomic accounting. Existing migration-history completion does not establish these future physical constraints.
- [Worker configuration](../../workers/mac-ai/src/config.ts) and [Ollama contract](../../workers/mac-ai/src/ollama.ts): today pin `dg-fast:latest`, a 4,096 context profile, two CRM tasks and a 90-second inference timeout. Introduce explicit specialist verification, structured output and machine-wide scheduling; do not relax the routine checks or share authority implicitly.
- [Signed provisioning](../../packages/platform-core/src/ai/local-worker-provisioning.ts) and [Slice 3 runbook](AI-GATEWAY-SLICE-3-RUNBOOK.md): require a separately designed specialist approval/provisioning lifecycle. Preserve loopback inference, HTTPS-only control, Keychain credentials, cloud-only database/encryption secrets, replay protection and narrow route exemptions.
- Authorisation: define platform diagnostic submit/read/cancel permissions and a revocable platform recipient approval distinct from tenant owner/admin approval. Revalidate current operator authority at each relevant boundary. Review worker protocol exposure and maintenance authentication without adding wildcard middleware exemptions.

## Dated operational baseline

As of this documentation review, **2026-10-09**, these are different evidence categories:

| Category | Recorded baseline and its limits |
| --- | --- |
| Implemented code | Slice 3 routine execution and signed provisioning guards exist; specialist execution remains rejected. [Historical Slice 3 review](AI-GATEWAY-SLICE-3-REVIEW.md) describes its pre-delivery test snapshot, not current activation. PR [#1001](https://github.com/w7tcv2m7tk-netizen/dg-platform-web/pull/1001) retired the completed reconciliation runtime. |
| Historical migration records | [Completion evidence](991-reconciliation-completed.json) records 13 completed rows, one canonical provisioning-boundary record and unchanged original 12. Its `applied_steps_count: 0` record reconciles history; it does not prove SQL was executed during reconciliation or certify every historical migration's physical effects. |
| Verified physical database state | The retained read-only evidence at `2026-10-08T21:33:52.022Z` verifies the recorded catalogue and seven empty protected tables. #1001's final release report records a further read-only comparison at `2026-10-08T22:01:28.855Z`, unchanged catalogue/tables/history, full-record hash `6bc026dfca90a6f2862b6fc7365deff504a9b6d090207b558d27542087b14619`. This PR performs no fresh database verification and makes no claim beyond that recorded scope. |
| Authorised operational activation | None granted by this readiness approval. Retained reports say worker provisioning absent, physical remediation disabled and reconciliation runtime retired. Code deployment, migration-history status and database structure do not authorise a worker, model installation, activation window or specialist inference. |

Preserve [security cleanup](991-SECURITY-CLEANUP.md), [physical executor review](991-PHYSICAL-EXECUTOR-REVIEW.md), [six-delta review](991-SIX-DELTA-REMEDIATION-REVIEW.md), preflight/completion JSON and all historical review/reconciliation records unchanged. Their time-specific statements remain historical evidence. This document does not reopen reconciliation, modify remediation controls or supersede PR #1001's security boundaries.

## Future PR sequence and separate approval gates

| Proposed increment | Reviewable deliverable | Separate gate |
| --- | --- | --- |
| PR 1 — this document | Contract, matrix, baseline and boundaries | Documentation review only; no merge/deploy without requested approval |
| PR 2 — design and executable contract validation | Resolve open decisions; versioned platform authorisation/evidence/result policy and synthetic validators | Approve precise architecture, numeric limits and model manifest before runtime implementation; keep specialist disabled |
| PR 3 — persistence and protocol | Additive schema/migrations, platform approvals, fenced job/retention/accounting extensions | Security and disposable PostgreSQL acceptance; migration deployment separately authorised |
| PR 4 — local specialist worker | Pinned identity/profile, structured completion, cancellation and scheduling/transition controls | Full synthetic matrix and Slice 1–3 regression evidence; installation/provisioning separately authorised |
| PR 5 — operator experience and readiness evidence | Inert diagnostic submission/read/review flow, runbook and rollback rehearsal | End-to-end review; no operational buttons that bypass existing authority |
| Operational rollout (separate from PR merge) | Reviewed migration plan, hardware/model verification, scoped provisioning/approval, smoke and rollback evidence | Explicit approval for each environment mutation, model install, worker provision and bounded activation window; default disabled |

No later gate is implied by approving an earlier one. Stop if physical schema verification, security review, provenance or acceptance evidence is incomplete. This sequence is a proposal, not permission to implement it now.

## Unresolved architectural decisions and Slice 5 relationship

Before PR 2 approval, resolve: platform scope representation and operator revocation source; platform recipient approval owner/lifetime; exact specialist artifact/licence/digest/profile and hardware memory budget; machine-wide routine/specialist scheduling and transition isolation; tokenizer admission measurement; final numeric limits and backup/restore deletion guarantees; how semantic grounding checks reject unsupported output; and the independently authorised specialist provisioning mechanism. These decisions cannot be inferred from the routine worker's existence.

The existing [AI Gateway slice roadmap](../ROADMAP.md#ai-gateway-slice-roadmap) remains authoritative. [PR #1002's Model Intelligence & Routing workstream](https://github.com/w7tcv2m7tk-netizen/dg-platform-web/pull/1002) belongs within Slice 5 and begins with its read-only audit. This readiness contract neither edits that roadmap nor starts a competing model registry. Slice 4's deployment manifest is the minimum execution identity/verification record; any future shared intelligence inventory must integrate with the existing Gateway policy and deployment records, without overriding disclosure, specialist approval or exact-observation semantics. Slice 5 implementation and activation retain their own approval gates.
