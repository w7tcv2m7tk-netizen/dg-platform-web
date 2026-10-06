# AI Architecture

**AI Native — shared service, not per-App chatbots**

**Related:** [AI-GOVERNANCE.md](../foundations/AI-GOVERNANCE.md) · [PLATFORM-INTELLIGENCE.md](./PLATFORM-INTELLIGENCE.md) · [BUSINESS-BRAIN.md](../foundations/BUSINESS-BRAIN.md) · [DIGITALGATE-INTELLIGENCE.md](../foundations/DIGITALGATE-INTELLIGENCE.md)

---

## Locked principle

> **The AI never owns the business data.** DigitalGate owns the business data; AI interprets it and acts **through** DigitalGate.

Vercel hosts the application. Vercel is **not** the AI architecture.

```
DigitalGate → Vercel → AI Service → Model Router → OpenAI / Anthropic / Gemini
```

| Layer | Role |
|-------|------|
| **Vercel** | Next.js app, API routes, cron, AI-facing server functions, env, observability |
| **DigitalGate AI Service** | Provider-agnostic abstraction in Platform Core (`packages/platform-core/src/ai/`) |
| **Model Router** | Chooses model per job (`llm.ts`) — Gateway / OpenAI / Anthropic failover |
| **OpenAI** | Primary provider initially |
| **Anthropic / Gemini** | Available via router when quality or economics win |
| **Business Brain + Digital Twin** | Supply context — what the business is and what is happening |
| **Tool Registry** | Controlled access to CRM, Commerce, Analytics, Automation, etc. |
| **Audit / AI usage ledger** | Records recommendations, approvals, tool calls, and outcomes |

---

## AI Gateway Slice 2 — CRM summary and follow-up drafts

**Historical Slice 2 snapshot:** statements below that local execution/worker jobs are unavailable describe the Slice 2 boundary. The later Slice 3 section supersedes those availability statements for its two approved tasks; production operational activation remains separately gated. Other policy and disclosure restrictions remain intact.

**Implemented tasks:** only CRM AI Assist `lead_summary` and `lead_follow_up`
pass through `gateway.ts` and version-1 task/disclosure policy in `policy.ts`.
Other AI features retain their existing `llmChat` paths and transport failover.
Follow-up output is an editable draft: no sending, outreach or tool execution.

The authenticated route supplies organisation, actor, server-generated correlation
ID and explicit policy; browser JSON cannot choose recipients or classification.
Existing tenant-scoped CRM retrieval and Business Context authorise access before
inference. The gateway fetches no knowledge and grants no data access. Its bounded
organisation-bound input/evidence envelope carries classification and recipient
restrictions, which intersect with registered task requirements. CRM contacts,
notes, activities and private Business Context have a `tenant_confidential` floor.
Approved knowledge does not automatically authorise cloud disclosure; these tasks
do not automatically retrieve Business Brain knowledge.

Classifications are `public`, `platform_internal`, `tenant_confidential` and
`restricted`. Classification alone never grants cloud permission. Confidential
CRM approval is **direct OpenAI, requested model `gpt-4o-mini`, only**. Transport
and upstream recipient are separate identities. Vercel AI Gateway and Anthropic
are prohibited for these tasks, including failover. Configuration is intersected
with approval: a different `OPENAI_MODEL`, or no direct key, causes deterministic
fallback rather than recipient substitution. No credentials/configuration change
is required. Existing non-migrated model defaults are unchanged.

The complete eligible attempt plan is validated before disclosure; `llmChat`
accepts an additive constrained plan while retaining legacy behavior when omitted.
The direct endpoint is `https://api.openai.com/v1/chat/completions`, the approved
model is explicit in the request, redirects are rejected, and `store: false` is
sent. The initial CRM policy permits one attempt, with no alternate transport or
model. This guarantees requested recipient/model identity, not physical serving
hardware or immutable weights behind the `gpt-4o-mini` alias. Technical routing
approval does not establish customer consent, contractual/regional compliance or
Zero Data Retention. OpenAI API abuse-monitoring retention remains applicable
unless separately approved account controls say otherwise; `store: false` is not
Zero Data Retention. No account/privacy settings are changed by this slice.

Execution requirements describe capability, grounding, text result contract,
interactive latency and context budget separately from model names. Lanes are
`local_routine`, `local_specialist`, `cloud_standard`, `cloud_reasoning` and
`exact_observation`. Current CRM execution uses the standard cloud lane. Reasoning
and specialist requirements cannot silently use routine deployments. Fallback
requires both execution permission and every applicable disclosure permission;
escalation cannot expand recipients. Unknown/malformed policy fails closed.
Exact observation requires one exact provider/model, no substitution, no
escalation and no added grounding: this is a policy invariant only. **AI Visibility
is not migrated**, and its production observation semantics are unchanged.

Both tasks retain the existing prompts, 1200 output-token ceiling, 12-second
inference deadline (maximum 20 seconds) and deterministic templates. Their declared
4096-token context limit uses a conservative UTF-8-byte upper bound plus framing
margin and output allowance. Oversize inputs fail safely without truncation,
recipient widening or escalation. Empty, invalid or oversized text results use
the same deterministic fallback. There is no general structured-output framework.

Existing Activity/AuditLog accounting stores bounded identity, correlation,
task/version, policy/version, effective classification, decision/reason, lane,
transport, upstream/model, local/cloud, latency, safe attempts/fallback/escalation,
validation and failure category. Provider usage is nullable; unknown is not zero.
Usage describes reported completed responses, not a complete bill for failed
attempts. Prompts, responses, contacts, evidence, credentials, provider exception
bodies and arbitrary caller metadata are excluded. Accounting failures are
non-fatal with a fixed warning; inference deadlines do not bound ledger writes.

**Local execution is designed but unavailable.** Local-required/restricted requests
return `local_transport_unavailable` with zero cloud calls. No Mac worker exists.
Raw Ollama remains external, localhost-only (`127.0.0.1:11434`) and unconnected to
production; it must never be exposed to LAN/internet. Outbound leased worker jobs
are planned, not implemented. OpenRouter is not implemented. No database
migration, new public endpoint or autonomous tool execution is introduced.

---

## Future capability — hybrid local + cloud inference

**Status:** Broader future architecture option. The bounded Slice 3 implementation below is the approved local-routine exception; this section does not authorise additional tasks, specialist execution, hardware clusters or production activation.

DigitalGate should preserve the option for the Model Router to choose between **frontier cloud models** and **approved local/on-premise models**. The Business Brain remains the governed context layer regardless of where inference runs.

```
DigitalGate Business Brain + governed context
                ↓
           Model Router
        ↙                 ↘
Local / edge model      Frontier cloud model
repetitive, bounded     hardest reasoning,
low-risk workloads      complex generation
        ↘                 ↙
      Tools · Audit · Usage · Learning
```

### Why retain this

Increasingly capable high-memory local AI hardware makes local inference practical for selected workloads. For DigitalGate this could become a **margin, privacy and resilience capability**, rather than a reason to move the production AI stack onto desktop hardware prematurely.

Potential benefits:

- reduce metered token cost for high-volume, repetitive inference;
- keep selected sensitive business data local or within a controlled customer environment;
- provide a lower-cost lane for classification, extraction, tagging, summarisation and other bounded work;
- reserve frontier models for tasks where reasoning quality materially matters;
- support future private/edge deployment options without changing the Business Brain or tool-governance model.

### Future routing policy

A later Model Router may score each task against **required intelligence, privacy/data locality, risk, cost, latency/availability and measured model fitness**. The target is task routing by intelligence + privacy + risk + cost, not sending every request to the largest frontier model.

Good local candidates are bounded, measurable tasks such as classification, extraction, normalisation, tagging, deduplication, lightweight summarisation and low-risk background processing. Frontier models remain the default for difficult reasoning, ambiguous recommendations, high-value generation and tasks that fail local quality thresholds.

### Guardrails and validation trigger

Local inference remains another provider lane behind the existing **DigitalGate AI Service / Model Router**; Apps still never call models directly. Business Brain, Digital Twin, permissions, Tool Registry, audit and human-approval rules remain authoritative. “Local” must not automatically be treated as private: runtime telemetry, storage and networking still require verification.

Do **not** build a Mac cluster as current production infrastructure. Revisit when production usage can identify repeatable workloads and measure tokens, cost, latency, quality and privacy requirements by task. Any proof of concept should compare an approved local model with the current cloud route on the same evaluation set, while keeping the hardware implementation replaceable.

---

## Governed autonomous operations — approved architecture direction

Inference supplies recommendations; DigitalGate separately authorises actions. The [AI Governance](../foundations/AI-GOVERNANCE.md#approved-governance-direction--7-october-2026) canon defines the AI Action Ledger lifecycle, Aida Autonomy Ladder, model/data disclosure provenance, future content governance and incident readiness. These extend the existing Context Builder, Tool Registry and Activity/AuditLog architecture rather than replacing AI Gateway policy.

Business Context and approved Business Brain knowledge evolve toward the [Evidence & Provenance Graph](../foundations/BUSINESS-BRAIN-KNOWLEDGE.md#evidence--provenance-graph-approved-long-term-direction). Approved knowledge still requires independent external-disclosure permission. Use structured evidence and decisions, never stored model chain-of-thought. Tenant isolation, capability permissions, connector authority and human approval remain execution boundaries.

Future persistent Aida responsibilities and business-impact measurement are captured in the [slice roadmap](../ROADMAP.md#ai-gateway-slice-roadmap). Slice 4 remains **Local Specialist Execution**. Slice 5 is **AI Governance, Autonomous Operations & Observability**, requiring a separately approved staged plan before implementation. Current Slice 1–3 contracts and AI Visibility exact-observation semantics are preserved; this direction grants no additional runtime authority.

---

## Product stack (not “AI integration”)

| Capability | Role |
|------------|------|
| **Business Brain** | Understands the business |
| **Digital Twin** | Represents current state |
| **AI Advisor** | Interprets state → prioritised recommendations |
| **AI Agents** | Communicate and perform work (via tools) |
| **Automation Engine** | Executes repeatable processes |
| **Command Centre** | Tells the operator what matters now |

---

## Runtime layers

```
App UI ("What should I do today?" / "Summarise this contact")
       ↓
AI Service (Platform Core)
  ├── Prompt Templates (per app, per action)
  ├── Context Builder
  │     ├── Business Profile / Brain
  │     ├── Digital Twin snapshot
  │     ├── Goals, opportunities, enquiries, tasks
  │     ├── Website / SEO / AI Visibility signals
  │     └── Platform Knowledge Layer (staff)
  ├── Tool Registry + Executor
  │     ├── App-declared aiTools in manifest
  │     ├── Permission-gated execution (DigitalGate owns writes)
  │     └── Human approval for consequential actions
  ├── Model Router
  │     ├── Vercel AI Gateway (transport)
  │     ├── Direct OpenAI
  │     ├── Anthropic
  │     └── template fallback in callers
  └── Usage / Audit ledger
       ↓
Provider APIs / Gateway
```

**Code:**

| Concern | Path |
|---------|------|
| Model router | `packages/platform-core/src/ai/llm.ts` |
| Assist generation | `packages/platform-core/src/ai/generate.ts` |
| Tool registry + executor | `packages/platform-core/src/ai/tools/` |
| Usage ledger | `packages/platform-core/src/ai/usage.ts` |
| Advisor briefing | `packages/platform-core/src/advisor/` |
| Context | `getBusinessContext()` · Twin · Brain |
| HTTP surface | `/api/v1/ai/assist` · `/api/v1/ai/tools/execute` |

Gateway auth: `AI_GATEWAY_API_KEY` or `VERCEL_OIDC_TOKEN`. Do not send `OPENAI_API_KEY` to Gateway (BYOK; Sol promo does not apply).

---

## Vertical slice (build this first)

**Advisor lock (24 Aug 2026):** Prioritise **ACT** over more sophisticated ASK.  
Capacity: **70% Act · 20% Context Builder · 10% Ask**.  
Full decision: [BUSINESS-ADVISOR-AI-INTEGRATION.md](../strategy/BUSINESS-ADVISOR-AI-INTEGRATION.md).

Before more agents, one complete path:

```
KNOW → UNDERSTAND → ADVISE → ACT → RECORD → LEARN
```

```
Business Brain → Context Builder → AI Advisor → Model Router → Tool → Action → Audit → Twin/Brain update
```

**Example:** “What should I do today?”

1. Context Builder gathers Brain, Twin, Goals, opportunities, enquiries, tasks, health, knowledge.
2. Advisor returns: Priority · Why · Evidence · Recommended action · **Do it**.
3. User approves (**trust ladder**: Recommend → Prepare → Approve → Execute → Governed automation).
4. **DigitalGate** (not the model) executes via a permission-controlled tool.
5. Platform records: recommendation → approval → tool call → result → audit → learning.

Do **not** ship Voice Agents, autonomous SDR/CRM/email, or per-App AI silos until this slice is dogfooded on DigitalGate + Founding 10.

**Founding 10 AI milestone (redefined):** every founding org experiences Brain → Advisor → Action — not “AI everywhere.”

---

## Monorepo layout (keep in-tree)

No separate AI microservice at this stage.

```
src/app/api/v1/ai/
  assist/
  tools/execute/
  (advisor / communications / visibility as they mature)

packages/platform-core/src/ai/
  llm.ts              # model router
  generate.ts         # assist prompts
  tools/              # registry + executor
  usage.ts            # AI usage ledger
  platform-intelligence.ts
```

Apps never call provider APIs directly.

---

## Rules

1. Apps never call LLM APIs directly
2. All prompts versioned and auditable
3. PII scoped to organisation; no cross-tenant context
4. Consequential actions require human approval (default)
5. AI Gateway is a **transport**, not the architecture
6. Task tiers: `standard` vs `reasoning` (`openai/gpt-5.6-sol` via Gateway when keyed)
7. Tool writes go through Platform Core with the same permissions as the user

---

## Dogfood checklist (AI Test org)

| # | Test | Pass when |
|---|------|-----------|
| 1 | Context accuracy | Advisor reflects real Brain / Twin / CRM state |
| 2 | Hallucination resistance | Refuses to invent contacts, numbers, or connectors |
| 3 | Tool permissions | Tool fails if the user lacks the permission |
| 4 | Action accuracy | Correct tool + params for the recommendation |
| 5 | Human approval | Consequential tools require explicit confirm |
| 6 | Auditability | Ledger shows recommendation → approval → tool → result |
| 7 | Cost | Tokens / model / latency per interaction recorded |
| 8 | Latency | Advisor + Do it feel interactive on production |
| 9 | Consistency | Same question yields sensible, stable priorities |
| 10 | Failure handling | Model / API / tool failure degrades without data corruption |

---

## Phase plan

| Phase | Deliverable |
|-------|-------------|
| **Now (70% Act)** | Expand tools: task create/assign, opportunity stage, follow-up, contact/opportunity create, draft comms; Advisor Do-it dogfood on DigitalGate org |
| **Now (20% Context)** | Shared Context Builder consumed by Advisor, Assist, Industry |
| **Now (10% Ask)** | Keep Ask grounded; do not chase cleverness |
| **Founding 10** | Every founding org feels Brain → Advisor → Action; measure trust, ignores, cost |
| **Later** | Prospecting “who next” + Documents prepare-from-template on same loop; Voice / Agents only after trust ladder Level 4–5 |

Legacy planning notes remain valid but **do not** override Act-first / Context Builder priority above.
# AI Gateway Slice 3 — local routine execution

Slice 3 adds an asynchronous `local_routine` path for `lead_summary` and `lead_follow_up` only. Cloud standard execution remains synchronous and retains the existing 12–20 second contract. Local selection never implies cloud permission or cloud fallback.

The cloud policy resolves an active worker deployment and an organisation-specific, classification-bounded approval before it accepts a job. The job snapshots organisation, authorised actor, task/policy versions, correlation, classification, lane, deployment and result contract. Tenant status/result/cancel requests are authorised against the current organisation session and CRM permissions. Worker identity is execution identity only; worker routes never accept a tenant selector and expose only a lease already assigned to that worker.

The Postgres job row owns lease generation, token hash, deadlines, retry count, cancellation, encrypted payload and encrypted result. PostgreSQL claim uses `FOR UPDATE SKIP LOCKED` and a partial unique index limits one live lease per worker. Fenced heartbeat/completion require worker, token, generation, active recipient approval, deployment, deadline and status. No transaction spans inference.

Job payloads and results use AES-256-GCM with versioned 32-byte keys from `AI_JOB_ENCRYPTION_KEY_V1` (and later numbered versions). The cloud runtime holds the keys and decrypts only after worker authentication and lease/recipient validation. This is application encryption at rest, not cloud-blind encryption. The Mac credential is a separate 256-bit bearer secret stored in Keychain; only SHA-256 hashes are persisted server-side.

The Mac worker polls over HTTPS and calls only Ollama at `127.0.0.1:11434`. It verifies the exact `dg-fast:latest` tag, pinned digest, Qwen3.5 9B Q4_K_M metadata, and fixed generation profile before inference. It processes one job at a time. `dg-coder`, `local_specialist`, model swapping, Advisor, Support Aida, tools, push transport and Level-3 envelope encryption remain outside Slice 3.
