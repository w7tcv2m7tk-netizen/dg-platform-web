# Opportunity Engine™

**Platform Core** capability — proactive intelligence across every DigitalGate tenant and prospect.

**Status:** Elevate — **major founding deepen priority**. Core detection + next-best-action on connected-business surfaces; **Prospecting & Opportunity Engine** is the commercial Growth App ($99/mo) for acquisition.  
**North-star:** [INTELLIGENT-LAYER.md](./INTELLIGENT-LAYER.md) — Twin → Decision Intelligence → Action → Learning.

**Customer-facing term:** Opportunities  
**Internal / IP name:** DigitalGate Opportunity Engine™  
**Core App UI:** `/apps/opportunities` (ranked operating opportunities for the connected business)  
**Growth App (commercial):** **Prospecting & Opportunity Engine** — `$99/mo` · `/apps/prospecting`  
**Customer home:** Feed Business Command Centre / Decision Intelligence (“what needs attention”)  
**Cockpit UI:** Command Centre (`/command/opportunities`, `/command/growth-engine`) — staff orchestrates / prioritises  
**Version:** 0.5 · August 2026

---

## Commercial lock — Prospecting & Opportunity Engine ($99/mo)

One **Growth App**, one price. Do **not** bill Prospecting, Discovery or Opportunity Engine as separate SKUs.

| Capability | In the App |
|------------|------------|
| Prospecting | Find and organise target businesses |
| Discovery | Structured discovery of current situation |
| Opportunity scoring | Fit × Need × Reachability × Commercial × Weakness |
| Pipeline | Track prospects through the sales process |
| Activity | Calls, notes, tasks, follow-ups |
| AI recommendations | Who to contact and what to do next |
| Digital Presence | Website, SEO, AI Visibility and related signals |
| CRM integration | Qualified prospects → Contacts, Companies, Opportunities |

**Demo journey:** Prospect → Discovery → Opportunity Score → CRM → Pipeline → AI Recommendation → Follow-up → Conversion

**Distinction:** The Core Opportunities surface ranks *operating* opportunities inside a connected tenant. The Growth App is the *acquisition* OS that finds and qualifies external prospects, then hands them into CRM.

Manifest: `packages/platform-core/src/apps/builtins/prospecting.ts` · Premium key: `prospecting_pro`

---

## Why this matters

Opportunity Engine is where DigitalGate starts behaving like **operating intelligence**, not a tool wall:

| Example | Impact | Recommended action |
|---------|--------|--------------------|
| Vendor leads not contacted within 15 minutes | High attention | Create follow-up sequence |
| Visibility strong in one suburb, weak in another | Growth | Guide + landing page + ads |
| Outstanding invoices | Revenue risk | Payment reminder sequence |
| CRM + Website, no AI Visibility | Expansion | Recommend Growth capability |

Deepen **useful** detections and honest actions before inventing new Growth Apps.

---

## Architecture (locked)

```
DIGITALGATE PLATFORM CORE
│
├── Universal Objects · Event Bus · AI · Scoring · Automation · …
│
├── OPPORTUNITY ENGINE  ← CORE
│     ├── Opportunity detection
│     ├── Opportunity scoring
│     ├── Opportunity types
│     ├── Opportunity lifecycle (V1 = ranked list)
│     ├── AI recommendations / next-best-action
│     └── Opportunity → Task / Lead / Campaign / Automation (execute hints)
│
└── Apps (CRM, RE, SEO, AI Visibility, Marketing, Acc, …)

CORE · OPPORTUNITIES APP  ← tenant module (`/apps/opportunities`)
│
└── All opportunities table (type · score · status · next action)

COMMAND CENTRE  ← cockpit (staff) — does not compete with Core Opportunities
│
├── Priorities
├── Opportunities          ← orchestrated “what matters today”
├── Prospecting
├── Recommended Actions
├── Alerts
└── Clients / Reports
```

**Core owns Opportunities · Command Centre orchestrates · Apps generate data · AI prioritises · Automation acts.**

**Prospecting & Opportunity Engine** (Growth App + Industry front ends) owns discovery capability — see [PROSPECTING-ENGINE.md](./PROSPECTING-ENGINE.md).  
Business Discovery ≠ Vendor / property discovery. Different front ends; one opportunity engine and one business record.  
Command Centre surfaces next actions — it is not the long-term home of full Discovery.

---

## Naming (do not confuse)

| Term | Meaning |
|------|---------|
| **Opportunities** | Customer / staff UI label |
| **DigitalGate Opportunity Engine™** | Core IP — detection + score + next-best-action |
| **CRM Opportunity** | Universal Object deal (`packages/platform-core/src/opportunities`) — separate |
| **Client expansion** | One *kind* of opportunity (missing apps · catalogue list prices) |
| **Growth Engine / Prospecting** | Acquisition OS UI under Command Centre |
| **Prospect Opportunity Score** | Detector input for prospect-kind opportunities |

---

## Sales Intelligence (voice → Opportunity Engine)

Voice Sales / Lead Qualifier agents produce **Opportunity Intelligence** after the call:

Conversation → structured fields (fit, need, urgency, commercial potential, decision-maker, current solution, primary problem, desired outcome, recommended next step) → **score 0–100** → CRM Opportunity + Call Centre → Command Centre (Direction).

Implementation: `packages/platform-core/src/communications/sales-intelligence.ts`  
Architecture: [VOICE-AGENT-ARCHITECTURE.md](../ai/VOICE-AGENT-ARCHITECTURE.md)

This is a primary bridge from AI Communications into Opportunity Engine scoring and human next-best-action.

---

## Opportunity shape (V1)

```typescript
PlatformOpportunity {
  id, kind, severity, score (0–100),
  title, summary, reasons[],
  recommendedAction, href,
  organisationId?, prospectId?,
  impactLabel?,  // honest — catalogue $ labelled; never invented Stripe MRR
  executeHints?  // task | email | call | campaign | report | pipeline | …
}
```

**Kinds:** `attention` · `follow_up` · `prospect` · `expansion` · `score_gap` · `ops` · `reputation`

**Honesty:** No fabricated Growth/Stripe MRR. Catalogue dollars are labelled list prices.

---

## Code

| Module | Path |
|--------|------|
| Engine | `packages/platform-core/src/opportunity-engine/` |
| List API | `listPlatformOpportunities({ scope: "staff" \| "org" })` |
| Detectors | overdue leads/tasks, client attention, expansion, prospect briefing |
| Core App | `/apps/opportunities` · manifest `opportunities` |
| Cockpit | `/command/opportunities` |
| Expansion detail | `/command/opportunities/expansion` |
| Badge API | `/api/v1/command/opportunities/summary` |
| Prospect briefing (detector) | `command-centre/growth-engine/opportunity-engine.ts` |

---

## Flow

```
Universal Objects + Events + Connectors + Scores + Timeline + Discovery
        ↓
   Opportunity Engine™
        ↓
Opportunity → Why → Value/impact → Confidence (score) → Recommended action → Execute
        ↓
Command Centre Opportunities (+ App deep-links)
```

Execute (V1): deep-link + execute hints. V2: trigger Automation / Comms / Task create.

---

## Related

- [COMMAND-CENTRE.md](../COMMAND-CENTRE.md)
- [GROWTH-ENGINE.md](../GROWTH-ENGINE.md)
- [CONNECTOR-ENGINE.md](./CONNECTOR-ENGINE.md)
- [BUSINESS-DISCOVERY.md](./BUSINESS-DISCOVERY.md)
- [INDUSTRY-INTELLIGENCE.md](./INDUSTRY-INTELLIGENCE.md) — upstream industry feeds → optional Act path into Opportunities
