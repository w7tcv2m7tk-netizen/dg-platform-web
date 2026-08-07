# DigitalGate Intelligence

**The ultimate moat — network intelligence from anonymised collective insights**

Software can be copied. **A growing corpus of what actually works across hundreds of businesses** is very difficult to replicate.

This is DigitalGate's greatest long-term asset — not the CRM, not the dashboard chrome.

**Later:** the same consented signals power **Network** recommendations (partners, communities, resources) — see [NETWORK-LAYER.md](./NETWORK-LAYER.md). Cohort intelligence (this doc) and Community/Marketplace are related but distinct: one is anonymised benchmarks; the other is opt-in discovery between members.

---

## What it is

**DigitalGate Intelligence** aggregates anonymised, consent-backed signals from all tenants to:

- Benchmark each customer against relevant cohorts  
- Recommend **proven actions** (not generic best practices)  
- Power AI Advisor with industry-specific evidence  
- Improve Scoring Engine weights over time  

Customers see: *"Agencies like yours that published suburb pages saw +11% appraisal enquiries."*

Command Centre sees: cohort trends, model performance, opportunity patterns.

---

## Intelligence inputs (with consent)

| Signal | Anonymised as |
|--------|---------------|
| Marketing channel performance | Channel → conversion rate by industry/region |
| SEO change impact | Change type → traffic delta distribution |
| Suburb page performance | Suburb category → enquiry rate (not address) |
| Lead response time | Industry → median response → conversion |
| Automation time saved | Automation type → hours saved distribution |
| AI Visibility trends | Industry → score change velocity |
| Review generation rate | Industry → reviews/month vs score impact |

**Opt-in:** Organisation `settings.intelligence.contribute: true` — default off until explicit consent (Platform 1.5).

---

## Privacy safeguards

| Rule | Detail |
|------|--------|
| **Minimum cohort size** | No benchmark published if N < 30 organisations |
| **No identifiable data** | Aggregates only; k-anonymity |
| **Regional cohorts** | e.g. "Gold Coast real estate" not "Roe Realty peers named" |
| **Opt-out** | Customer can use platform without contributing |
| **Audit** | Intelligence queries logged in Command Centre |

See [DATA-GOVERNANCE.md](./DATA-GOVERNANCE.md) and [AI-GOVERNANCE.md](./AI-GOVERNANCE.md).

---

## Architecture

```
Tenant events + Twin snapshots
       ↓
Anonymisation pipeline (nightly)
       ↓
Intelligence warehouse (aggregates only)
       ↓
Benchmarking Engine
       ↓
├── Customer dashboard ("You vs average")
├── BI Engine (evidence-backed recommendations)
├── AI Advisor (Command Centre)
└── Scoring Engine (weight tuning)
```

Separate from tenant Postgres — aggregate store (could be same DB, different schema, or analytics warehouse).

---

## Benchmark example

**Customer view:**

| Metric | You | Gold Coast avg | Top 10% |
|--------|-----|----------------|---------|
| AI Visibility | 87 | 64 | 92 |
| Lead response | 2.1 hrs | 4.8 hrs | 1.2 hrs |
| Review rate | 3.2/mo | 1.8/mo | 5.1/mo |

**AI recommendation:**

> Based on 847 Gold Coast agencies, publishing suburb landing pages correlated with +11% appraisal enquiries. You have none this month. Recommended: Currumbin Waters, Tallebudgera Valley, Elanora.

That's not generic SEO advice — it's **platform evidence**.

---

## Intelligence Engine (internal)

Not a customer App. Part of Platform Core + Command Centre:

| Module | Function |
|--------|----------|
| Cohort manager | Define industry × region cohorts |
| Aggregate jobs | Nightly rollups |
| Benchmark API | Org-scoped comparisons |
| Recommendation enricher | Adds evidence to BI insights |
| Model feedback | Which recommendations converted |

Manifest reference: contributes to `command-centre` and `scoring` — no separate customer nav.

---

## Flywheel

```
More tenants
    → richer aggregates
    → better benchmarks
    → better recommendations
    → better client outcomes
    → higher Success Score
    → lower churn
    → more tenants
```

---

## Phase plan

| Phase | Deliverable |
|-------|-------------|
| **1.0** | Architecture + consent model defined (this doc) |
| **1.5** | Manual cohort reports for Roe (internal only) |
| **2.0** | Benchmark API; customer dashboard comparisons (N≥30) |
| **2.5** | Evidence-backed BI recommendations |
| **3.0** | ML-weight tuning; industry report products |

---

## Defensibility (three lenses)

| Lens | How Intelligence delivers |
|------|---------------------------|
| **Scalable** | Aggregates computed offline — O(1) read per org |
| **Reusable** | Same engine serves RE, hospitality, services |
| **Defensible** | Data network effect — compounding moat |

---

## Related

- [COMMAND-CENTRE.md](../COMMAND-CENTRE.md) — Benchmarking module  
- [CUSTOMER-SUCCESS.md](./CUSTOMER-SUCCESS.md) — Success Score  
- [COMMERCIAL-MODEL.md](./COMMERCIAL-MODEL.md) — intelligence as premium tier?  
