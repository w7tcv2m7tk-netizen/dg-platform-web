# AI Architecture

**AI Native — shared service, not per-App chatbots**

**Related (foundational):** [PLATFORM-INTELLIGENCE.md](./PLATFORM-INTELLIGENCE.md) — Platform Knowledge Layer, live tools, confidence levels, Super Admin AI. Distinct from app-level assist and from [DIGITALGATE-INTELLIGENCE.md](../foundations/DIGITALGATE-INTELLIGENCE.md) (cohort moat).  
**Gen 2 north-star (§5–6, §27, §31–32):** [../architecture/GEN-2-ARCHITECTURE-BRIEF.md](../architecture/GEN-2-ARCHITECTURE-BRIEF.md)

---

## Layers

```
App UI ("Summarise this contact")
       ↓
AI Service (Platform Core)
  ├── Prompt Templates (per app, per action)
  ├── Context Builder
  │     ├── Universal Objects
  │     ├── Knowledge Graph
  │     ├── Digital Twin snapshot
  │     ├── Business Memory
  │     └── Platform Knowledge Layer (docs + live tools — see PLATFORM-INTELLIGENCE)
  ├── Tool Registry
  │     ├── App-declared aiTools in manifest
  │     └── Knowledge Tool Registry (platform/ops — design)
  └── Model Router
       ├── Vercel AI Gateway (openai/gpt-5.4-mini · openai/gpt-5.6-sol)
       ├── Direct OpenAI
       ├── Anthropic
       └── template fallback in callers
       ↓
Provider APIs / Gateway
```

**Code:** `packages/platform-core/src/ai/llm.ts` — Gateway Chat Completions (`openai/gpt-5.4-mini` standard, `openai/gpt-5.6-sol` reasoning) with direct OpenAI / Anthropic failover. Auth: `AI_GATEWAY_API_KEY` or `VERCEL_OIDC_TOKEN`.

Full stack for platform Q&A / ops:

```
DIGITALGATE AI
  → PLATFORM KNOWLEDGE LAYER (Documentation | Live Platform | Connectors)
  → CONTEXT / RAG ENGINE
  → MODEL ROUTER
  → ANSWER + ACTION ENGINE
```

---

## Business Memory

Structured organisational memory — **not chat history**.

Categories: interactions, writing style, terminology, reports, campaigns, AI content, decisions, preferences, prompts.

**Code:** `packages/platform-core/src/memory/`

Apps read/write memory only through AI Service — not directly.

---

## App integration

Each App manifest declares `aiTools[]`:

```typescript
{ id: "crm.summarise_contact", label: "Summarise contact", description: "…" }
```

Platform registers tools; AI Service dispatches with org-scoped context.

---

## Rules

1. Apps never call LLM APIs directly  
2. All prompts versioned and auditable  
3. PII scoped to organisation; no cross-tenant context  
4. Human review for high-risk outputs (contracts, legal) — Phase 2  
5. AI Gateway is a **transport**, not the only path. Direct OpenAI / Anthropic stay as failover. Do not send `OPENAI_API_KEY` to Gateway (BYOK; Sol promo does not apply).  
6. Task tiers: `standard` (CRM assist, reviews, websites) vs `reasoning` (Advisor, Platform Intelligence, Founding onboarding analysis → `openai/gpt-5.6-sol` via Gateway when keyed).

---

## Scoring + BI

AI Visibility Score™ and BI insights feed from Twin + Graph — AI Service generates **narratives** and **recommended actions**, not just numbers.

**Related:** [GEN-2-ARCHITECTURE-BRIEF.md](../architecture/GEN-2-ARCHITECTURE-BRIEF.md) — Gen 2 north-star · [PLATFORM-INTELLIGENCE.md](./PLATFORM-INTELLIGENCE.md) — Platform AI / Knowledge Layer · [PLATFORM-ARCHITECTURE.md](../PLATFORM-ARCHITECTURE.md) — BI Engine, Scoring Engine · [COMMUNICATIONS-ARCHITECTURE.md](./COMMUNICATIONS-ARCHITECTURE.md) — voice & messaging orchestration · [CONNECTOR-PRIORITY.md](../foundations/CONNECTOR-PRIORITY.md) — Model Router / OpenAI in DigitalGate 15 · [INDUSTRY-INTELLIGENCE.md](../foundations/INDUSTRY-INTELLIGENCE.md) — Core industry feed Understand layer (summarise / personalise; not article reprint)

---

## Phase plan

| Phase | Deliverable |
|-------|-------------|
| Q3 2026 | Context builder stub; contact summary |
| Q4 2026 | Business Memory persistence; prompt templates |
| Q1 2027 | Tool registry live; RE appraisal narrative |
