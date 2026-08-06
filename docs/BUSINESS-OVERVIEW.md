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
| 11 | Growth Opportunities | Upsell / expansion |
| 12 | Recent Reports | Report links |
| 13 | Team Activity | Optional — RE teams, etc. |

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
- **DigitalGate staff** — client counts (Command Centre link)  

---

## Data pipeline

```
Connectors → Digital Twin → Scoring Engine → BI Engine → Business Overview
```

**Live mode** (when `DATABASE_URL` + org session): dashboard loads real KPIs from Postgres, probes WordPress site health and RE summary, calculates Business Health from the Twin snapshot, and generates rule-based briefings and recommended actions.

**Preview mode**: shown when no database session — setup prompts and static demo scores.

Implementation:
- `packages/platform-core/src/overview/gather-live-metrics.ts` — Postgres KPIs
- `packages/platform-core/src/twin/capture-snapshot.ts` — Digital Twin snapshot
- `packages/platform-core/src/scoring/calculate-scores.ts` — Business Health calculation
- `packages/platform-core/src/intelligence/generate-intelligence.ts` — briefing, priorities, insights
- `src/lib/overview-connectors.ts` — WordPress / Stripe / site health probes

---

## Related

- [PRODUCT-VISION.md](./PRODUCT-VISION.md)  
- [COMMAND-CENTRE.md](./COMMAND-CENTRE.md) — internal mirror with cohort view  
- Customer dashboard vs Command Centre: same pipeline, different audience  
