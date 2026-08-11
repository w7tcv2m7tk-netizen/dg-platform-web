# Opportunity Engine™

**Platform Core** capability — proactive intelligence across every DigitalGate tenant and prospect.

**Customer-facing term:** Opportunities  
**Internal / IP name:** DigitalGate Opportunity Engine™  
**Core App UI:** `/apps/opportunities` (full ranked list for the org)  
**Cockpit UI:** Command Centre (`/command/opportunities`) — orchestrates / prioritises  
**Version:** 0.3 · August 2026

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

Prospecting workflows live under Command Centre. Prospect / Opportunity **scoring and objects** live in Core so every future industry reuses the same engine.

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
