# DigitalGate Platform Intelligence Layer

**Foundational Gen 2 capability — live truth + docs + tools, not a doc chatbot**

**Version:** 0.1  
**Date:** August 2026  
**Status:** Architecture locked (design) — **not** a full agent product yet  
**Source:** Platform Architect  
**Applicable platform version:** Generation 2 (`dg-platform-web`)

**Canonical path:** [`docs/ai/PLATFORM-INTELLIGENCE.md`](./PLATFORM-INTELLIGENCE.md)  
**Gen 2 north-star (§5 Knowledge · §6 Tool Registry · §7 Super Admin AI):** [../architecture/GEN-2-ARCHITECTURE-BRIEF.md](../architecture/GEN-2-ARCHITECTURE-BRIEF.md) — this doc is the depth lock; brief points here

---

## What this is

**Platform Intelligence** (also **Platform AI** / **Platform Knowledge**) is the shared knowledge and tool layer that lets DigitalGate AI answer questions about:

1. How DigitalGate itself works (architecture, Apps, permissions, APIs, pricing)
2. How a given business is configured on the platform
3. What is happening live (errors, integrations, automations, deployments)

It is **not** a dumb RAG-over-markdown chatbot. Answers must combine **documentation**, **live platform state**, and **privileged tools** — with explicit confidence and citations.

**Do not confuse with:**

| Document | What it covers |
|----------|----------------|
| [DIGITALGATE-INTELLIGENCE.md](../foundations/DIGITALGATE-INTELLIGENCE.md) | Cohort / network moat — anonymised cross-tenant benchmarks |
| [INDUSTRY-INTELLIGENCE.md](../foundations/INDUSTRY-INTELLIGENCE.md) | External industry feeds → attributed briefings |
| This doc | How AI knows the **platform**, a **business**, and **live system** truth |

---

## Architecture (locked)

```
DIGITALGATE AI
  → PLATFORM KNOWLEDGE LAYER
       → Documentation | Live Platform | Connectors
  → CONTEXT / RAG ENGINE
  → MODEL ROUTER
  → ANSWER + ACTION ENGINE
```

| Layer | Role |
|-------|------|
| **Platform Knowledge Layer** | Indexes docs + exposes live/org/config tools + connector health |
| **Context / RAG Engine** | Retrieves relevant chunks; attaches tool results; builds prompt context |
| **Model Router** | Selects provider/model per task ([AI-ARCHITECTURE.md](./AI-ARCHITECTURE.md)) |
| **Answer + Action Engine** | Produces cited answers; later: propose / act-with-confirm |

All LLM calls go through the shared **AI Service** — Apps never call providers directly.

---

## Product split

| Product | Audience | Question shape |
|---------|----------|----------------|
| **DigitalGate AI** | Tenant users | “Ask about *your* business” — CRM, scores, opportunities, content |
| **DigitalGate Platform AI** | Staff + (later) advanced tenants | “Ask about *DigitalGate itself*” — how the platform works, fleet health, what’s broken |

**Super Admin / DigitalGate Intelligence (staff):** Private Super Admin AI tied to **Command Centre**. Fleet questions, health, deployments, “what’s broken” — must **cite sources** (plan docs, file paths, dates). Never hallucinate confidently.

See [COMMAND-CENTRE.md](../COMMAND-CENTRE.md).

---

## Three knowledge levels

### 1. Platform Knowledge

Architecture, Universal Objects, Core, Apps, terminology, pricing, permissions, workflows, APIs, specs.

**Sources:** `docs/**`, ADRs, manifests, Feature Registry, API standards.

### 2. Business Knowledge

Org config, installed Apps, plans/subscriptions, integrations, Business Profile for **that** organisation.

**Sources:** org-scoped Platform API / DB — never another org’s data.

### 3. Live System Knowledge

Query the running platform: automation runs, Twilio/API status, audit, errors, delivery, deployments.

**Sources:** observability, connectors, audit log, health endpoints — with privilege gates.

---

## Confidence levels (non-negotiable)

| Level | Meaning | Behaviour |
|-------|---------|-----------|
| 🟢 **Confirmed** | Backed by retrieved doc chunk, ADR, or live tool result | State the fact; cite source (path, date, tool) |
| 🟡 **Likely** | Strong inference from incomplete evidence | Label as likely; say what’s missing |
| 🔴 **Unknown** | No evidence | **Do not invent.** Offer to inspect logs / run a tool / open a ticket |

Never present 🔴 as 🟢. Prefer “I don’t know — I can check X” over a plausible fiction.

---

## Knowledge Tool Registry (design)

The Answer Engine selects tools by question type. Registry is design-only until Phase 2+.

| Tool | Knowledge level | Typical question |
|------|-----------------|------------------|
| `search_documentation` | Platform | “How do permissions work?” |
| `search_codebase` | Platform | “Where is Feature Registry enforced?” |
| `get_platform_config` | Platform / Live | Feature flags, env capability (non-secret) |
| `get_business` | Business | Org profile, installs |
| `get_user` | Business | Membership, roles (org-scoped) |
| `get_subscription` | Business | Plan, billing status |
| `get_app_status` | Business / Live | App install + health |
| `get_integration_status` | Live | Connector / Twilio / WP status |
| `get_recent_errors` | Live | Recent failures for org or fleet* |
| `get_audit_log` | Live | Who changed what |
| `get_deployment` | Live | Deploy / release status* |
| `get_api_status` | Live | API / provider health* |
| `get_automation` | Live | Automation run status |
| `get_contact` | Business | Contact record (org-scoped) |
| `get_opportunity` | Business | Platform Opportunity or CRM Opportunity (disambiguate) |

\*Super Admin / staff only — never exposed to tenant DigitalGate AI without an explicit privilege model.

**App-declared tools** (`aiTools[]` in manifests) remain for in-App actions; this registry is the **platform knowledge / ops** set. See [AI-ARCHITECTURE.md](./AI-ARCHITECTURE.md).

---

## Relation to floating support chat

Current **floating support chat** (`SupportChatWidget` / `src/lib/support-chat.ts`) is a **thin client UX** — conversation proxy to Gen 1 / support inbox, not Platform Intelligence.

| Today | Target |
|-------|--------|
| Thin chat UX + WP-backed support | Same shell can later call Platform AI |
| Human / legacy AI replies | Cited answers from Knowledge Layer + tools |
| Detach backlog P3 | Migrate backend; **do not rip out** the widget |

**Migration path (no big-bang):**

1. Keep floating chat UI and routes.
2. Phase 1+: optional “Platform help” mode → RAG over docs with citations (staff first).
3. Phase 2+: org-scoped live tools behind the same panel for authenticated tenants.
4. Retire WP support AI only when Gen 2 path is equal or better ([WP-DETACH-BACKLOG.md](../WP-DETACH-BACKLOG.md)).

Platform Intelligence is the **deeper layer**; support chat is the **surface**.

---

## Docs SSOT structure

Target tree for Platform Knowledge indexing (map to current paths as we grow — do not mass-move overnight):

```
/docs
  architecture          → PLATFORM-ARCHITECTURE.md, PLATFORM-PRINCIPLES.md
  core                  → foundations/CORE-OBJECT-SPECIFICATION.md, …
  universal-objects     → catalogues/OBJECT-MODEL.md
  apps/*                → App specs + manifests (code + docs)
  ai                    → ai/* (this folder)
  automation            → (growth / foundations as authored)
  crm                   → contacts, CRM workflows
  websites              → websites/
  infrastructure        → foundations/INFRASTRUCTURE.md, infrastructure/
  connectors/*          → connectors/
  api                   → PLATFORM-API.md, standards/API-STANDARDS.md
  billing               → foundations/COMMERCIAL-MODEL.md, commerce/
  permissions           → Feature Registry docs / ADR 0007
  troubleshooting       → (to be expanded)
  deployment            → deploy / release docs
  security              → standards/SECURITY-STANDARDS.md
  changelog             → (release notes — future)
  decisions/            → pointer → adr/ (ADRs)
```

**ADRs live at [`docs/adr/`](../adr/README.md).** [`docs/decisions/`](../decisions/README.md) is the stable alias for “Architecture Decision Records.”

### Document versioning metadata

Every indexed knowledge component should carry:

| Field | Purpose |
|-------|---------|
| **version** | Doc or component version |
| **date** | Last substantive update |
| **status** | Draft / Design / Accepted / Shipped / Deprecated |
| **source** | Author or system of record |
| **applicable platform version** | Gen 2 / Platform 1.0 scope, etc. |

RAG citations should surface path + date (+ ADR id when applicable).

---

## Holds (do not violate)

| Hold | Detail |
|------|--------|
| **No fake live answers** | Unknown → 🔴; offer to inspect |
| **No cross-org leakage** | Business + live tools are org-scoped; staff tools are privileged |
| **Super Admin tools privileged** | Fleet / deploy / global error tools require `dg:staff` (or equivalent) |
| **Brand Studio** | Core capability — **roadmap**; not in this build ([BRAND-STUDIO.md](../foundations/BRAND-STUDIO.md)) |
| **Opportunity Engine™** | Internal / IP name; customer UI says Opportunities ([OPPORTUNITY-ENGINE.md](../foundations/OPPORTUNITY-ENGINE.md)) |
| **Reputation** | Growth App + Core Universal Review plumbing — do not clobber dirty Reviews files for this doc track |
| **Not the cohort moat** | [DIGITALGATE-INTELLIGENCE.md](../foundations/DIGITALGATE-INTELLIGENCE.md) remains separate |

---

## Roadmap phases

| Phase | Deliverable | Build now? |
|-------|-------------|------------|
| **0** | Doc structure + ADRs + this architecture | ✅ Docs only |
| **1** | Super Admin RAG over docs with **citations** (Command Centre) | Next engineering slice |
| **2** | Live tools (org-scoped) wired into Context Engine | Later |
| **3** | Diagnose + propose actions (no auto-mutate) | Later |
| **4** | Safe **act-with-confirm** (human gate; audit) | Later |

**What is NOT built in Phase 0:** agent runtime, full tool implementations, production RAG index, Super Admin chat product UI beyond existing Command Centre advisor stubs, Brand Studio, or replacement of floating support chat.

---

## Suggested first engineering slice (Phase 1)

1. Index `docs/**` + `docs/adr/**` with path/date metadata.
2. Staff-only Command Centre entry: ask → retrieve → answer with **citations** (file path + heading).
3. Enforce confidence: if retrieval empty → 🔴 Unknown.
4. Log prompts/responses per [AI-GOVERNANCE.md](../foundations/AI-GOVERNANCE.md).
5. Leave floating support chat unchanged; optional deep-link “View platform docs answer” later.

---

## Related

- [GEN-2-ARCHITECTURE-BRIEF.md](../architecture/GEN-2-ARCHITECTURE-BRIEF.md) — Gen 2 north-star (§5–7)
- [AI-ARCHITECTURE.md](./AI-ARCHITECTURE.md) — AI Service, Model Router, app `aiTools`
- [AI-GOVERNANCE.md](../foundations/AI-GOVERNANCE.md) — policy, org scope, audit
- [COMMAND-CENTRE.md](../COMMAND-CENTRE.md) — Super Admin / AI Business Advisor surface
- [CAPABILITY-MODEL.md](../CAPABILITY-MODEL.md) — capability map
- [PRODUCT-VISION.md](../PRODUCT-VISION.md) — AI woven through the OS
- [ROADMAP.md](../ROADMAP.md) — execution lock entry
- [adr/](../adr/README.md) — Architecture Decision Records
