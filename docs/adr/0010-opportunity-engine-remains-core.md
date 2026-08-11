# ADR 0010: Opportunity Engine™ remains Platform Core

**Status:** Accepted  
**Date:** August 2026  
**Deciders:** Founder & Platform Architect

---

## Context

Opportunities appear in customer UI, Command Centre orchestration, CRM deals, and Growth Engine prospecting. Without a clear ownership boundary, teams risk building parallel “opportunity” engines per App or treating Command Centre as the system of record.

DigitalGate needs one detection / scoring / next-best-action engine reusable across industries, while staff still need a cockpit to prioritise what matters today.

---

## Decision

1. **Opportunity Engine™** is a **Platform Core** capability — detection, scoring, types, lifecycle, AI recommendations, and execute hints live in Core.  
2. **Customer-facing label** is **Opportunities**; **Opportunity Engine™** remains the internal / IP name.  
3. **Command Centre orchestrates** (priorities, staff views) — it does **not** own the Opportunity object model or compete with Core.  
4. **CRM Opportunity** (deal Universal Object) remains a separate concept; do not collapse naming.  
5. Spec: [foundations/OPPORTUNITY-ENGINE.md](../foundations/OPPORTUNITY-ENGINE.md).

---

## Consequences

### Positive

- One engine for every industry App  
- Clear IP naming vs customer UX  
- Command Centre stays a cockpit, not a second Core  

### Negative / trade-offs

- Naming discipline required (docs, UI copy, code comments)  
- Detectors must stay honest (no fabricated Stripe MRR)  

### Neutral

- Growth Engine / prospecting UI remains under Command Centre; scoring objects stay Core  

---

## References

- [foundations/OPPORTUNITY-ENGINE.md](../foundations/OPPORTUNITY-ENGINE.md)  
- [COMMAND-CENTRE.md](../COMMAND-CENTRE.md)  
- [CAPABILITY-MODEL.md](../CAPABILITY-MODEL.md)  
- [ai/PLATFORM-INTELLIGENCE.md](../ai/PLATFORM-INTELLIGENCE.md)
