# ADR 0013: GTM / rollout strategy adopted as canonical product–marketing lock

**Status:** Accepted  
**Date:** 2026-08-11  
**Deciders:** Ben (Platform Architect)

## Context

Architecture constraints are locked in the Gen 2 Architecture Brief ([ADR 0012](./0012-gen-2-architecture-brief-adopted.md)), but go-to-market risked drifting: “marketing platform” language, feature-list pitching, vanity metrics, premature international campaigns, and AI Visibility claims beyond what the product measures.

Ben issued a full DigitalGate rollout / GTM brief (positioning, Phases 1–12, first-12-months table, metrics, flywheel, holds).

## Decision

1. Adopt [`docs/strategy/DIGITALGATE-ROLLOUT.md`](../strategy/DIGITALGATE-ROLLOUT.md) as the **canonical product and marketing strategy** for Gen 2 rollout.  
2. Positioning lock: **AI-powered Business Operating Platform** with outcome line **One platform to run, understand and grow your business**.  
3. GTM follows AU RE wedge → Founding Customers → Prospecting Engine → later PLG/content/geo — without authorizing free-audit builds, LinkedIn systems, or pricing redesign in this ADR.  
4. Marketing and product claims stay honest: presence/SEO-style AI Visibility only; no fake LLM citation ranks; no decorative scores; no digitalgate.com.au cutover yet.  
5. Cross-link from Product Vision, Roadmap, Architecture Brief, Capability Model, Global Readiness, and docs README.

## Consequences

### Positive

- One SSOT for how DigitalGate is sold and sequenced  
- Clear holds reduce premature intl / vanity / fake-score work  
- Aligns sales motion with Growth Engine + Opportunity Engine already in Core  

### Negative / trade-offs

- Commercial naming (Business vs older “Agency”) needs later copy convergence  
- Free-tool PLG and content systems remain deferred — pressure to build early must be refused  

### Neutral

- Does not replace GLOBAL-READINESS Country Pack engineering or COMMERCIAL-MODEL billing mechanics  

## References

- [DIGITALGATE-ROLLOUT.md](../strategy/DIGITALGATE-ROLLOUT.md)  
- [GEN-2-ARCHITECTURE-BRIEF.md](../architecture/GEN-2-ARCHITECTURE-BRIEF.md) · [ADR 0012](./0012-gen-2-architecture-brief-adopted.md)  
- [PRODUCT-VISION.md](../PRODUCT-VISION.md) · [ROADMAP.md](../ROADMAP.md) · [GLOBAL-READINESS.md](../foundations/GLOBAL-READINESS.md)  
- [SEO-AND-AI-VISIBILITY.md](../foundations/SEO-AND-AI-VISIBILITY.md) · [GROWTH-ENGINE.md](../GROWTH-ENGINE.md)
