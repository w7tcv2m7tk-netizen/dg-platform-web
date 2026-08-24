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
