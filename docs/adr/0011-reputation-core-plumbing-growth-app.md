# ADR 0011: Reputation = Core plumbing + Growth App surface

**Status:** Accepted  
**Date:** August 2026  
**Deciders:** Founder & Platform Architect

---

## Context

Reviews, reputation scoring, and referral concepts were easy to conflate: Platform Refer & Earn (SaaS), Business Referral Network (Phase 5+), and customer-facing review/reputation product. Shipping “Reviews” as either pure Core chrome or a disconnected App would either bloat Core UI or duplicate Universal Review models.

---

## Decision

1. **Core owns** Universal Review Object, Reputation Service, connector-backed sources, aggregation, events/notifications, and **Reputation Score™ only when real connected data exists** (never decorative stand-ins).  
2. **Growth App** (`reviews` / customer label **Reputation**) is the product surface: inbox, request queue, sources UI, honest empty states, score display when data exists. Routes remain `/apps/reviews/*`.  
3. **Platform Refer & Earn** and **Business Referral Network** stay separate surfaces — do not blend into Reputation.  
4. **Reputation Pro** (campaigns, AI respond UX, competitor analysis) remains roadmap on top of this floor.  
5. Spec: [foundations/REVIEWS-AND-REFERRALS.md](../foundations/REVIEWS-AND-REFERRALS.md).

---

## Consequences

### Positive

- Stable Core object model; Apps stay packaging  
- Honest scores only when connectors provide data  
- Clear separation from SaaS referrals and B2B referral network  

### Negative / trade-offs

- Two layers to explain (Core plumbing vs Growth App)  
- Registry id `reviews` vs label Reputation — intentional dual naming  

### Neutral

- Existing Reputation Growth App work may be dirty nearby — doc/architecture changes must not clobber that track  

---

## References

- [foundations/REVIEWS-AND-REFERRALS.md](../foundations/REVIEWS-AND-REFERRALS.md)  
- [CAPABILITY-MODEL.md](../CAPABILITY-MODEL.md)  
- [ai/PLATFORM-INTELLIGENCE.md](../ai/PLATFORM-INTELLIGENCE.md)
