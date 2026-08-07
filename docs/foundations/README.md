# Platform Foundations

**Governance, scalability, and commercialisation — the remaining 20%**

Before committing to implementation, these documents define the decisions that are expensive to change later.

**Status:** Architecture ~80% complete. Foundations defined here close the gap.

---

## Decision filters

### Three lenses (every decision)

| Lens | Question |
|------|----------|
| **Scalable** | Can this support thousands of organisations? |
| **Reusable** | Will multiple industries benefit from it? |
| **Defensible** | Does this create IP competitors can't easily copy? |

### Five pillars (every feature)

1. Does it help **connect** systems?
2. Does it **centralise** information?
3. Does it improve **understanding**?
4. Does it **automate** work?
5. Does it help the customer **grow**?

If **no** to all five → not core to the platform.

### Execution filter (from [ROADMAP.md](../ROADMAP.md))

Does this strengthen **Platform Core** or the **Real Estate App**? If no, defer — unless it is foundational governance documented here.

---

## Foundation documents

| # | Document | Covers |
|---|----------|--------|
| 1 | [CORE-OBJECT-SPECIFICATION.md](./CORE-OBJECT-SPECIFICATION.md) | **Canonical domain model** — what, fields, relationships, ownership, events |
| 2 | [PLATFORM-RELEASES.md](./PLATFORM-RELEASES.md) | Platform versioning (1.0, 1.5, 2.0…) — outcomes not endless features |
| 3 | [APP-MARKETPLACE.md](./APP-MARKETPLACE.md) | Install, license, update, remove, version — third-party ready |
| 4 | [GLOBAL-READINESS.md](./GLOBAL-READINESS.md) | **Build globally / sell AU first** — Country Packs, currencies, tax, GTM stages |
| 5 | [WHITE-LABELLING.md](./WHITE-LABELLING.md) | Agency-branded platform — design now, enable later |
| 6 | [DATA-GOVERNANCE.md](./DATA-GOVERNANCE.md) | Ownership, export, backups, retention, deletion, compliance |
| 7 | [CUSTOMER-SUCCESS.md](./CUSTOMER-SUCCESS.md) | Adoption, usage, onboarding, health alerts — built into product |
| 8 | [IN-PLATFORM-EDUCATION.md](./IN-PLATFORM-EDUCATION.md) | Tours, help, tooltips, AI explanations — platform teaches itself |
| 9 | [OBSERVABILITY.md](./OBSERVABILITY.md) | API, errors, automations, AI, queues, connectors |
| 10 | [COMMERCIAL-MODEL.md](./COMMERCIAL-MODEL.md) | Subscriptions, Apps, AI tiers, marketplace, enterprise |
| 11 | [AI-GOVERNANCE.md](./AI-GOVERNANCE.md) | Models, automation boundaries, approval, logging, privacy |
| 12 | [DIGITALGATE-INTELLIGENCE.md](./DIGITALGATE-INTELLIGENCE.md) | Anonymised network intelligence — the ultimate moat |
| 13 | [NETWORK-LAYER.md](./NETWORK-LAYER.md) | **Phase 5** — Community, B2B network, Marketplace; design now, build later |
| 14 | [REVIEWS-AND-REFERRALS.md](./REVIEWS-AND-REFERRALS.md) | **A** Platform Refer & Earn (Core/Billing) · **B/C** Business referrals + Reviews (Phase 5+) |

---

## Implementation gate

**Do not expand implementation** until:

1. ✅ Core Object Specification reviewed and accepted  
2. ✅ Platform Release 1.0 scope locked  
3. ✅ Data governance + AI governance principles accepted  
4. ⏳ Postgres provisioned and schema aligned to Core Object Spec  

Foundations docs can evolve in patch releases; **Core Object fields and relationships** require ADR to change after Platform 1.0 ships.

---

## Related documents

- [PLATFORM-PRINCIPLES.md](../PLATFORM-PRINCIPLES.md) — engineering constitution  
- [PLATFORM-ARCHITECTURE.md](../PLATFORM-ARCHITECTURE.md) — technical blueprint  
- [catalogues/OBJECT-MODEL.md](../catalogues/OBJECT-MODEL.md) — object index (summary)  
- [domain/DOMAIN-MODEL.md](../domain/DOMAIN-MODEL.md) — bounded contexts  
