# ADR 0008: DigitalGate Command Centre as internal App

**Status:** Accepted  
**Date:** August 2026  
**Deciders:** Founder & Platform Architect

---

## Context

DigitalGate needs operational intelligence beyond what customers see on their dashboards. Account managers, leadership, and support require cross-tenant views: platform health, client success, revenue, benchmarking, automated reporting, and upsell opportunities.

Options considered:

1. **WordPress-style super-admin** — separate admin UI, duplicated patterns, no reuse of App model  
2. **Third-party BI tool** (Metabase, Looker) — fast initially, no Twin integration, no AI advisor, data leaves platform  
3. **Internal App in Platform Core** — same manifest, API, scoring, and AI stack; staff-only visibility  

Most SaaS products stop at option 1 or 2. DigitalGate's differentiation depends on intelligence powered by the Digital Twin and Scoring Engine across all tenants.

---

## Decision

Introduce **DigitalGate Command Centre** as an **internal-tier App**:

- `tier: "internal"`, `visibility: "internal"` on App manifest  
- Routes under `/command/*`, gated by `dg:staff` Clerk role  
- Never appears in customer navigation or App marketplace  
- Consumes Scoring Engine, BI Engine, Digital Twin, and AI Service — same pipeline as customer dashboard  
- Cross-tenant Platform API reads are staff-scoped and audit-logged  

Introduce **DigitalGate Success Score™** as a composite score (`success_score`) computed from usage, visibility, SEO, automation, reviews, conversion, and growth.

---

## Consequences

**Positive:**

- One architecture for customer and internal intelligence — no parallel admin codebase  
- Command Centre improves as Core, Connectors, and Apps add data  
- Success Score gives clients one number; gives DG team a ranking signal  
- Monthly Growth Reports and AI Advisor become product features, not manual ops  
- Benchmarking creates network-effect moat as tenant count grows  

**Negative:**

- Cross-tenant access requires strict audit and least-privilege — security review before production  
- Internal App could tempt feature creep — must not delay Platform Core or RE App  
- Benchmarking needs minimum cohort size for anonymity — document thresholds  

**Neutral:**

- Exception to "no new Apps" rule — internal App does not compete with customer Apps for build priority  

---

## References

- [COMMAND-CENTRE.md](../COMMAND-CENTRE.md)  
- `packages/platform-core/src/apps/builtins/command-centre.ts`  
- `packages/platform-core/src/command-centre/types.ts`
