# AI Governance

**AI is central to DigitalGate — define rules before automation scales**

Extends [ai/AI-ARCHITECTURE.md](../ai/AI-ARCHITECTURE.md) with policy and compliance.

Platform Q&A / Super Admin AI must also follow [ai/PLATFORM-INTELLIGENCE.md](../ai/PLATFORM-INTELLIGENCE.md): org-scoped tools, privileged Super Admin tools, and 🟢/🟡/🔴 confidence (never invent).

---

## Principles

| Principle | Detail |
|-----------|--------|
| **Human accountable** | AI recommends; humans decide unless explicitly auto-approved |
| **Org-scoped context** | No cross-tenant data in prompts — ever |
| **Auditable** | Every AI call logged — prompt hash, model, tokens, actor |
| **Transparent** | Customer can see when AI generated content |
| **Minimal PII** | Send only fields required for the task |
| **Provider agnostic** | Model router — not locked to one vendor |

---

## Approved governance direction — 7 October 2026

The following invariants guide future implementation. They do not claim that the full ledger, autonomy framework or incident system is implemented today, and do not expand Slice 1–3 runtime scope. Delivery belongs to the staged [Slice 5 roadmap](../ROADMAP.md#ai-gateway-slice-roadmap).

### AI Action Ledger

Every consequential autonomous AI action must be reconstructable after the fact through this canonical lifecycle:

`agent → trigger → business context/evidence → permission/capability → data classification/disclosure policy → model/provider/deployment → external system/tool → intended action → human approval where required → action attempted → result → verification → audit`

Record structured evidence references, provenance, decision summaries, permission/policy versions, approval context, attempts and outcomes with a tenant-scoped correlation identity. Record denied, failed and uncertain attempts as such. Verification must distinguish a tool accepting a request from the intended business outcome being confirmed. Capture externally consequential attempts durably and reconcile uncertain outcomes before retries; retries must not silently duplicate external effects.

Do not store or require model chain-of-thought. Reconstruction uses structured facts and decisions, not private model reasoning. Evidence references and safe, minimised records must respect access classification and retention; auditability does not justify keeping plaintext prompts, secrets or sensitive evidence indefinitely.

Inference and action authority are separate: a model producing a recommendation never grants itself permission to execute it. DigitalGate checks current tenant/actor permissions, capability, connector authority and approval at the execution boundary. A recommendation, approved knowledge item or prior approval cannot bypass revocation or expand recipients. Existing Activity/AuditLog events are the starting point for the ledger, not evidence that the complete future lifecycle is already covered.

### Aida Autonomy Ladder

`Read → Analyse → Recommend → Draft → Request Approval → Execute → Verify → Audit`

Each capability has an explicit maximum level. Risk, tenant policy, user permissions, connector authority and action type determine how far Aida may proceed; a level is not a blanket grant across tools or tenants. Human approval remains an explicit boundary for consequential actions and binds the intended action and scope. Any governed automation must have explicit bounded authority; a material scope change requires fresh authorisation. Read-only or drafting capabilities may stop early, while their observations and outputs remain attributable and auditable.

This expands the existing Recommend → Prepare → Approve → Execute → Governed automation trust ladder. It does not enable autonomous agents or relax existing prohibitions such as automatic publication of web content.

### AI Model & Data Disclosure Registry

Build on AI Gateway task, classification, execution and recipient policies; do not create a competing policy engine. Retain durable execution provenance sufficient to identify tenant and initiating actor/agent, provider, requested model and observed identity where available, deployment/version or digest, local/cloud execution, information classification, authorising task/disclosure/execution policy version, and external recipients/systems. Distinguish requested aliases from verified serving identities; do not claim physical hardware or immutable cloud weights without evidence.

Approved knowledge is not approval for external model disclosure. Local execution is not automatically private, and cloud fallback must satisfy every applicable execution and disclosure restriction. Restricted/local-required requests cannot cloud-fallback. Exact-observation tasks retain their exact provider/model and observation contract. Retain safe provenance for the applicable audit/incident horizon even when ciphertext/content is purged; do not retain secrets or reconstruct purged content from audit records. A future retention design must reconcile durability with privacy, deletion and legal obligations.

### AI Content Governance (future)

Across Websites, SEO, Growth and Aida, material AI-generated customer-facing content should support provenance, supporting evidence, approval state, responsible actor/agent, publication action and subsequent performance/outcome measurement. Drafting is separate from publication authority; existing approval and connector boundaries apply. This direction does not authorise automatic publication.

### AI Incident & Breach Readiness (future)

Architecture must support reconstruction of affected tenants, actors, models/deployments, disclosures/recipients, connectors, actions and outcomes after a security, privacy or operational incident. Correlate the Action Ledger, execution provenance and evidence references within authorised incident access. Preserve failure and verification uncertainty rather than inventing successful outcomes. A full incident workflow, breach tooling and response automation require a later scoped plan; none is implemented by this approval.

---

## Initial model planning examples (historical)

| Use case | Models (initial) | Review cycle |
|----------|------------------|--------------|
| Summaries, reports | GPT-4o, Claude Sonnet | Quarterly |
| Embeddings | text-embedding-3-small | Quarterly |
| High-stakes (contracts) | Human review required — no auto | Always |

These initial examples are not a production allowlist. Current task/model/recipient eligibility is governed by the versioned AI Gateway policies and approved deployments in [AI Architecture](../ai/AI-ARCHITECTURE.md). **Model Router** selects within that policy; config in Platform Core — not hardcoded in Apps.

New models require security review before production.

---

## Automation boundaries

| Action type | Default | Can auto? |
|-------------|---------|-----------|
| Summarise contact | Suggest | ✅ Yes |
| Draft email | Suggest | ⚠️ User sends |
| Growth Report narrative | Generate → review | ⚠️ AM approves (1.5); auto (2.0 opt-in) |
| Change CRM data | — | ❌ Never without explicit rule |
| Publish web content | — | ❌ Never auto |
| Send SMS/email to client | — | ❌ Requires automation rule + opt-in |
| Pricing / legal text | — | ❌ Human only |

**Rule:** `ai.auto_execute` feature flag per org — off by default. A flag or model recommendation alone grants no execution authority; current capability permissions, tenant policy, connector authority and action-specific approval remain required.

---

## Human approval workflow

```typescript
AiOutput {
  id
  organisationId
  toolId
  status: "draft" | "approved" | "rejected" | "sent"
  content
  approvedBy?
  approvedAt?
}
```

Growth Reports, campaign copy, and client-facing AI content start as `draft`.

---

## Logging & retention

| Field | Stored |
|-------|--------|
| `organisationId`, `userId`, `toolId` | Yes |
| `model`, `tokens`, `latencyMs`, `costCents` | Yes |
| Full prompt | Historical retention proposal only; task-specific minimisation, disclosure and retention rules govern storage |
| Full response | Only in an authorised output store under its task-specific retention policy; not general audit logs |
| PII in logs | Redacted |

Enterprise customers may request AI log export — [DATA-GOVERNANCE.md](./DATA-GOVERNANCE.md).

---

## Customer data in AI

| Data type | Sent to LLM? |
|-----------|--------------|
| Contact name, history summary | Only with tenant/user access and explicit task/recipient disclosure permission |
| Full contact export | No — summarise first |
| Other tenants' data | Never |
| Anonymised benchmarks | Aggregates only — [DIGITALGATE-INTELLIGENCE.md](./DIGITALGATE-INTELLIGENCE.md) |
| Connector credentials | Never |

Apps call **AI Service only** — never provider APIs directly.

---

## Customer communication

Disclose in Terms + in-product:

- AI assists recommendations and content  
- Models may change; quality monitored  
- Customer can opt out of AI features (Enterprise)  
- Opt-in required for anonymised benchmark contribution  

---

## Incident response

| Scenario | Action |
|----------|--------|
| Prompt injection attempt | Rate limit + log; block pattern |
| Wrong tenant data in response | P1 incident; disable tool; root cause |
| Provider outage | Policy-permitted fallback only; otherwise graceful degrade. Restricted/local-required never cloud-fallback; exact observations never substitute |
| Harmful output | Report button; human review queue |

---

## Related

- [ai/AI-ARCHITECTURE.md](../ai/AI-ARCHITECTURE.md) — technical architecture, vertical slice, dogfood checklist  
- [DATA-GOVERNANCE.md](./DATA-GOVERNANCE.md) — data ownership  
- [OBSERVABILITY.md](./OBSERVABILITY.md) — AiUsageLog  

**Ledger (slice v0):** `recordAiLedgerEvent` writes `Activity` (`sourceApp: ai`) + `AuditLog` for `ai.recommendation` → `ai.approved` → `ai.tool_executed` / `ai.tool_failed`. 
