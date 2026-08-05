# AI Architecture

**AI Native — shared service, not per-App chatbots**

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
  │     └── Business Memory
  ├── Tool Registry (app-declared aiTools in manifest)
  └── Model Router (OpenAI, Anthropic, Gemini)
       ↓
Provider APIs
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

---

## Scoring + BI

AI Visibility Score™ and BI insights feed from Twin + Graph — AI Service generates **narratives** and **recommended actions**, not just numbers.

**Related:** [PLATFORM-ARCHITECTURE.md](../PLATFORM-ARCHITECTURE.md) — BI Engine, Scoring Engine · [COMMUNICATIONS-ARCHITECTURE.md](./COMMUNICATIONS-ARCHITECTURE.md) — voice & messaging orchestration

---

## Phase plan

| Phase | Deliverable |
|-------|-------------|
| Q3 2026 | Context builder stub; contact summary |
| Q4 2026 | Business Memory persistence; prompt templates |
| Q1 2027 | Tool registry live; RE appraisal narrative |
