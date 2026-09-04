# DigitalGate Business Overview

**The CEO dashboard — not a CRM**

**Route:** `/dashboard`  
**Question answered in 5 seconds:** *How is my business performing today, and what should I do next?*

---

## Design principles

1. **Intelligence first** — AI briefing and priorities are the hero, not contact lists  
2. **Scores with context** — Business Health™ with breakdown; every score links to its App  
3. **Insights over charts** — prose intelligence until trends matter  
4. **Every action has impact** — recommended actions show measurable outcomes  
5. **One timeline** — universal activity feed across Apps  
6. **Modular by industry** — same platform, different widgets per installed Apps  
7. **Complex underneath. Simple on top.** — the owner sees decisions and actions, not implementation complexity  
8. **Proactive by default** — DigitalGate should identify what needs attention and recommend the next sensible action instead of waiting for the owner to know what to ask

---

## Layout (default order)

| # | Widget | Purpose |
|---|--------|---------|
| 1 | Daily Briefing | AI morning summary — no clicking required |
| 2 | Today's Priorities | Largest card — AI Business Advisor focus list |
| 3 | Business Health | Score + dimensional breakdown |
| 4 | Today's Snapshot | KPI tiles (leads, revenue, pipeline, etc.) |
| 5 | Business Intelligence | AI-written insight bullets |
| 6 | Recommended Actions | Impact-labelled actions with buttons |
| 7 | Activity Timeline | Cross-app events |
| 8 | Performance Trends | 12-month Business Health sparkline |
| 9 | Connected Systems | Connector health cards |
| 10 | AI Studio | Quick AI prompts |
| 11 | Growth Opportunities | Evidence-backed growth opportunities |
| 12 | Recent Reports | Report links |
| 13 | Team Activity | Optional — RE teams, etc. |

The default interaction hierarchy is:

> **What is happening? → Does it matter? → What should I do?**

Advanced detail remains available progressively: **Simple → Explain → Advanced**.

---

## Modularity (roadmap)

Widgets stored in `org.settings.overview.widgets`:

- **Moved** — drag order  
- **Hidden** — user preference  
- **Resized** — grid span  
- **Saved** — per org, per role  

Industry defaults:

- **Real Estate** — pipeline, appraisals, listings KPIs  
- **Accommodation** — occupancy, check-ins  
- **Finance** — settlements  

DigitalGate platform operators use the separate **Command Centre** control plane rather than a customer-dashboard variant.

---

## Data and intelligence pipeline

```text
Native Platform Core + authorised connectors
        ↓
Canonical business objects + events
        ↓
Business Brain Knowledge + business context
        ↓
Scoring / intelligence
        ↓
Signal → Insight → Recommendation → Action → Outcome → Learning
        ↓
Business Overview
```

**Native Gen 2 rule:** Platform Core / Neon is the system of record. Normal production runtime does not depend on WordPress. WordPress is retained only as a migration connector for onboarding legacy WordPress clients; after validated cutover it is disconnected.

**Live mode** (when `DATABASE_URL` + organisation session): the dashboard loads organisation-scoped Platform Core data and authorised connector signals, calculates relevant health/intelligence indicators, and produces briefings, priorities, insights and recommended actions.

**Preview mode**: shown when no database session — setup prompts and clearly-labelled demonstration data only.

The Business Overview should progressively consume **approved, current Business Brain Knowledge** alongside live operational context so recommendations can reflect the organisation's goals, principles, decisions and known operating context. See [foundations/BUSINESS-BRAIN-KNOWLEDGE.md](./foundations/BUSINESS-BRAIN-KNOWLEDGE.md).

Implementation areas include:
- `packages/platform-core/src/overview/gather-live-metrics.ts` — Platform Core KPIs
- `packages/platform-core/src/twin/capture-snapshot.ts` — contextual snapshot where still used
- `packages/platform-core/src/scoring/calculate-scores.ts` — Business Health calculation
- `packages/platform-core/src/intelligence/generate-intelligence.ts` — briefing, priorities, insights
- authorised native connectors — supplementary external signals, never alternate systems of record for canonical Gen 2 objects

---

## Business Owner Simplicity Gate

The Business Overview is not complete merely because it can display more data. For each widget or recommendation ask:

> **Could this be dramatically easier for the business owner?**

Prefer a clear insight and action over a dashboard that requires the owner to interpret raw information. The machine should do the thinking where appropriate; the human should make the decisions that matter.

---

## Related

- [PRODUCT-VISION.md](./PRODUCT-VISION.md)  
- [COMMAND-CENTRE.md](./COMMAND-CENTRE.md) — DigitalGate operator-only control plane  
- [foundations/BUSINESS-BRAIN-KNOWLEDGE.md](./foundations/BUSINESS-BRAIN-KNOWLEDGE.md) — governed organisational memory  
- Customer Business Overview and Command Centre may consume shared Platform Core signals, but they are **different products for different audiences**, not mirrored interfaces.
