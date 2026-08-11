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

## Approved models

| Use case | Models (initial) | Review cycle |
|----------|------------------|--------------|
| Summaries, reports | GPT-4o, Claude Sonnet | Quarterly |
| Embeddings | text-embedding-3-small | Quarterly |
| High-stakes (contracts) | Human review required — no auto | Always |

**Model Router** selects per task; config in Platform Core — not hardcoded in Apps.

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

**Rule:** `ai.auto_execute` feature flag per org — off by default.

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
| Full prompt | Hashed + truncated; full in secure store 90 days |
| Full response | Stored with AiOutput if customer-facing |
| PII in logs | Redacted |

Enterprise customers may request AI log export — [DATA-GOVERNANCE.md](./DATA-GOVERNANCE.md).

---

## Customer data in AI

| Data type | Sent to LLM? |
|-----------|--------------|
| Contact name, history summary | Yes — org-scoped |
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
| Provider outage | Fallback model or graceful degrade |
| Harmful output | Report button; human review queue |

---

## Related

- [ai/AI-ARCHITECTURE.md](../ai/AI-ARCHITECTURE.md) — technical architecture  
- [DATA-GOVERNANCE.md](./DATA-GOVERNANCE.md) — data ownership  
- [OBSERVABILITY.md](./OBSERVABILITY.md) — AiUsageLog  
