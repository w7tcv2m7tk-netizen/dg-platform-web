# ADR 0012: Architecture Brief adopted as Gen 2 north-star constraints

**Status:** Accepted  
**Date:** 2026-08-11  
**Deciders:** Ben (Platform Architect)

## Context

DigitalGate Gen 2 has accumulated many capability locks (Connectors / DG15, Business Services, Platform Intelligence, Industry Intelligence, Opportunity Engine Core, Reputation hybrid, Wantd-as-org). Without a single north-star brief, teams risk treating the platform as a feature pile or re-litigating settled boundaries.

Ben issued the full **Architecture & Product Considerations Brief** (sections 1–36 + Immediate Priority 1–15 + strategic north star).

## Decision

1. Adopt [`docs/architecture/GEN-2-ARCHITECTURE-BRIEF.md`](../architecture/GEN-2-ARCHITECTURE-BRIEF.md) as the **canonical Gen 2 architecture & product constraints** document.  
2. Treat Immediate Priority **1–15** as the architectural build order filter; **do not** implement all 36 sections as one programme.  
3. Where the brief and prior ADRs/docs differ (notably Reputation Core+Growth, Command vs Core), the brief’s **Alignment notes** + prior ADRs win — do not silently contradict.  
4. Cross-link from Capability Model, Product Vision, Roadmap, Connector Priority, Platform / Industry Intelligence, Business Setup, docs README, and AI Architecture.

## Consequences

### Positive

- One place for OS-level constraints and north star  
- Clear “already locked elsewhere” pointers reduce duplication  
- Immediate Priority list keeps execution focused  

### Negative / trade-offs

- Brief is broad; readers must follow links for depth  
- Alignment notes must be updated when locks change  

### Neutral

- Does not replace PLATFORM-PRINCIPLES or PLATFORM-ARCHITECTURE — complements them  

## References

- [GEN-2-ARCHITECTURE-BRIEF.md](../architecture/GEN-2-ARCHITECTURE-BRIEF.md)  
- [ADR 0010](./0010-opportunity-engine-remains-core.md) · [ADR 0011](./0011-reputation-core-plumbing-growth-app.md)  
- [CONNECTOR-PRIORITY.md](../foundations/CONNECTOR-PRIORITY.md) · [PLATFORM-INTELLIGENCE.md](../ai/PLATFORM-INTELLIGENCE.md) · [INDUSTRY-INTELLIGENCE.md](../foundations/INDUSTRY-INTELLIGENCE.md) · [BUSINESS-SETUP.md](../foundations/BUSINESS-SETUP.md)
