# Platform Foundations

**Governance, scalability, and commercialisation — the remaining 20%**

Before committing to implementation, these documents define the decisions that are expensive to change later.

**Gen 2 north-star (constraints):** [../architecture/GEN-2-ARCHITECTURE-BRIEF.md](../architecture/GEN-2-ARCHITECTURE-BRIEF.md)  
**App hierarchy (canonical):** [APP-HIERARCHY.md](./APP-HIERARCHY.md) — **Core → Infrastructure → Industry → Growth**  
**Operator experience (locked):** [OPERATOR-EXPERIENCE.md](./OPERATOR-EXPERIENCE.md) — *Simple for the operator. Powerful for the business. Intelligent underneath.*  
**Organisation lifecycle (locked):** [ORGANISATION-LIFECYCLE.md](./ORGANISATION-LIFECYCLE.md) — *Authentication establishes identity. Membership establishes tenant context. Explicit onboarding creates a tenant.*  
**Environment parity (locked):** [ENVIRONMENT-PARITY.md](./ENVIRONMENT-PARITY.md) — Local/Preview/Production run the same architecture; only config, credentials, external modes and data differ.  
**Platform IA & terminology (locked):** [PLATFORM-IA.md](./PLATFORM-IA.md) — Command / Sales / Partners / Customer Workspaces; prevent semantic drift  
**Sidebar / nav (locked):** [SIDEBAR-NAVIGATION.md](./SIDEBAR-NAVIGATION.md) — capability-aware CORE → … → PLATFORM ADMIN  
**Connected Business (locked):** [CONNECTED-BUSINESS.md](./CONNECTED-BUSINESS.md) — *Connect your business. Give it a brain.* Philosophy & positioning  
**Connected Business implementation:** [CONNECTED-BUSINESS-IMPLEMENTATION.md](./CONNECTED-BUSINESS-IMPLEMENTATION.md) — P0–P2 ship brief · marketing · knowledge layers  
**Master Business Plan (Business Brain context):** [../strategy/DIGITALGATE-MASTER-BUSINESS-PLAN.md](../strategy/DIGITALGATE-MASTER-BUSINESS-PLAN.md) — what DigitalGate is, sells, how it operates; Live vs Vision for AI  
**Business Body™ (locked):** [BUSINESS-BODY.md](./BUSINESS-BODY.md) — human-readable living-organisation model for education & onboarding (not UI chrome)  
**Intelligent layer (north-star):** [INTELLIGENT-LAYER.md](./INTELLIGENT-LAYER.md) — Connect · Centralise · Understand · Automate · Grow + Digital Twin™ centrepiece  
**GTM / rollout (product–marketing):** [../strategy/DIGITALGATE-ROLLOUT.md](../strategy/DIGITALGATE-ROLLOUT.md)  
**Commercialisation operating target:** [COMMERCIALLY-READY-V1.md](./COMMERCIALLY-READY-V1.md) — next milestone **5 founding agencies**; pre-launch marketing stance; Gate 1–4; 🔴/🟠/🟢 hierarchy

**Status:** Architecture ~80% complete. Foundations defined here close the gap. Commercial milestone is **Commercially Ready v1**, not “finish Gen 2.”

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
3. Does it improve **understanding** (Twin)?
4. Does it **automate** / **act**?
5. Does it help the customer **grow** — and does the outcome **learn** into the next recommendation?

If **no** to all → not core to the platform.

Full north-star loop: [INTELLIGENT-LAYER.md](./INTELLIGENT-LAYER.md) — Connect → Centralise → Understand → **Decide** → Act → **Learn** → Grow (Twin → Intelligence → Action → Learning).

### Execution filter (from [ROADMAP.md](../ROADMAP.md))

Does this strengthen **Platform Core** or the **Real Estate App**? If no, defer — unless it is foundational governance documented here.

---

## Foundation documents

| # | Document | Covers |
|---|----------|--------|
| — | [OPERATOR-EXPERIENCE.md](./OPERATOR-EXPERIENCE.md) | **Locked** — DigitalGate Principle: simple for the operator; Operator vs Admin; Simple → Advanced |
| — | [SIDEBAR-NAVIGATION.md](./SIDEBAR-NAVIGATION.md) | **Locked** — final sidebar structure + capability-aware access model |
| — | [CONNECTED-BUSINESS.md](./CONNECTED-BUSINESS.md) | **Locked** — Connected Business philosophy; Business Health meaning; Brain purpose; flywheel |
| — | [CONNECTED-BUSINESS-IMPLEMENTATION.md](./CONNECTED-BUSINESS-IMPLEMENTATION.md) | **Ship brief** — P0–P2, knowledge layers, marketing surfaces, architecture principle |
| — | [BUSINESS-BODY.md](./BUSINESS-BODY.md) | **Locked** — Business Body™ / DNA / Brain mental model for education; not organ sidebar UI |
| — | [APP-HIERARCHY.md](./APP-HIERARCHY.md) | **Canonical App hierarchy** — Core → Infrastructure → Industry → Growth; platform capabilities ≠ Apps |
| — | [INDUSTRY-PLATFORM.md](./INDUSTRY-PLATFORM.md) | **Twelve Industry Apps → Templates** — public readiness lanes; Accommodation under Hospitality |
| — | [ROLES-PERMISSIONS-SIDEBAR.md](./ROLES-PERMISSIONS-SIDEBAR.md) | **Locked** — user types, org roles, granular permissions, side panel, partners, pricing |
| — | [INTELLIGENT-LAYER.md](./INTELLIGENT-LAYER.md) | **North-star** — Twin centrepiece; BI scores; Advisor; AI Actions; opportunity detection; Marketplace/Agents later |
| — | [BUSINESS-BRAIN.md](./BUSINESS-BRAIN.md) | Customer knowledge corpus — seven dimensions; DNA; distinct from Digital Twin; Body framework |
| — | [../strategy/DIGITALGATE-MASTER-BUSINESS-PLAN.md](../strategy/DIGITALGATE-MASTER-BUSINESS-PLAN.md) | **Business Brain master** — DG strategy, commercial model, Live vs Vision instructions for AI |
| — | [COMMERCIALLY-READY-V1.md](./COMMERCIALLY-READY-V1.md) | **Operating target** — 5 founding agencies, pre-launch GTM stance, Gates 1–4, pre-sell 6 reds, NOW backlog |
| 1 | [CORE-OBJECT-SPECIFICATION.md](./CORE-OBJECT-SPECIFICATION.md) | **Canonical domain model** — what, fields, relationships, ownership, events |
| 1c | [DOCUMENTS-AND-SIGNING.md](./DOCUMENTS-AND-SIGNING.md) | **Core** — Document Engine + Signing Engine; Industry templates; not Infrastructure |
| 1b | [CONTACTS-AND-APP-ROLES.md](./CONTACTS-AND-APP-ROLES.md) | **ONE Contact** — forbid duplicate people (Guest/Vendor/Buyer…); Contact → App Role |
| 2 | [PLATFORM-RELEASES.md](./PLATFORM-RELEASES.md) | Platform versioning (1.0, 1.5, 2.0…) — outcomes not endless features |
| — | [APP-HIERARCHY.md](./APP-HIERARCHY.md) | **Canonical public/commercial App order** — Core → Infrastructure → Industry → Growth |
| 3 | [APP-MARKETPLACE.md](./APP-MARKETPLACE.md) | Install, license, update, remove, version — third-party ready |
| 4 | [GLOBAL-READINESS.md](./GLOBAL-READINESS.md) | **Build globally / sell AU first** — Country Packs, currencies, tax, GTM stages |
| 5 | [WHITE-LABELLING.md](./WHITE-LABELLING.md) | Agency-branded platform — design now, enable later |
| 6 | [DATA-GOVERNANCE.md](./DATA-GOVERNANCE.md) | Ownership, export, backups, retention, deletion, compliance |
| 7 | [CUSTOMER-SUCCESS.md](./CUSTOMER-SUCCESS.md) | Adoption, usage, onboarding, health alerts — built into product |
| 8 | [IN-PLATFORM-EDUCATION.md](./IN-PLATFORM-EDUCATION.md) | Tours, help, tooltips, AI explanations — platform teaches itself |
| 9 | [OBSERVABILITY.md](./OBSERVABILITY.md) | API, errors, automations, AI, queues, connectors |
| 10 | [COMMERCIAL-MODEL.md](./COMMERCIAL-MODEL.md) | Subscriptions, Apps, AI tiers, marketplace, enterprise |
| 11 | [AI-GOVERNANCE.md](./AI-GOVERNANCE.md) | Models, automation boundaries, approval, logging, privacy |
| 12 | [DIGITALGATE-INTELLIGENCE.md](./DIGITALGATE-INTELLIGENCE.md) | Anonymised network intelligence — the ultimate moat (distinct from Industry Intelligence feeds) |
| 13 | [NETWORK-LAYER.md](./NETWORK-LAYER.md) | **Phase 5** — Community, B2B network, Marketplace; design now, build later |
| 14 | [REVIEWS-AND-REFERRALS.md](./REVIEWS-AND-REFERRALS.md) | **A** Platform Refer & Earn (Core/Billing) · **B/C** Business referrals + Reviews (Phase 5+) |
| 15 | [WEBSITE-BUILDER.md](./WEBSITE-BUILDER.md) | **Phase later** — AI Website Studio; structured Next.js Gen 2 model (not PHP); design now |
| [BRAND-STUDIO.md](./BRAND-STUDIO.md) | **Core** — AI Brand Studio; Business Profile → identity → presence; Website Builder is a surface |
| [SERVICES-APP.md](./SERVICES-APP.md) | **Business App** — DG OS for service businesses; ServiceM8-class coverage on Universal Objects + Service Templates (not a FSM clone) |
| [PROPERTY-ECOSYSTEM.md](./PROPERTY-ECOSYSTEM.md) | **Industry** — Real Estate Sales · Property Management · Commercial Property · Accommodation · Property Development (future) |
| [SERVICES-BETA-LAUNCH.md](./SERVICES-BETA-LAUNCH.md) | Services closed-beta launch checklist (founding agencies) |
| [BUSINESS-APPS-SCAFFOLD.md](./BUSINESS-APPS-SCAFFOLD.md) | Finance · Creator · Commercial · Automotive — honest product-map floor (not closed beta) |
| 16 | [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) | **Core Platform Service** — Domains/DNS/SSL/hosting/email; Dreamscape V1 adapter; sandbox-first |
| 16b | [EMAIL-INFRASTRUCTURE.md](./EMAIL-INFRASTRUCTURE.md) | **Email Service** — transactional (Resend), mailbox (Dreamscape), deliverability; no mail server |
| [PROSPECTING-ENGINE.md](./PROSPECTING-ENGINE.md) | Growth — shared Prospecting Engine · Business vs Vendor/Buyer discovery |
| [BUSINESS-DISCOVERY.md](./BUSINESS-DISCOVERY.md) | Growth — Business (B2B) Discovery only |
| [OPPORTUNITY-ENGINE.md](./OPPORTUNITY-ENGINE.md) | Core — Opportunity Engine Daily Briefing |
| [BUSINESS-SETUP.md](./BUSINESS-SETUP.md) | **Core · Business Services** — Start Your Business; ABR + ASIC DSP (hold) + Dreamscape via Connectors |
| [INDUSTRY-INTELLIGENCE.md](./INDUSTRY-INTELLIGENCE.md) | **Core** — Industry Intelligence (feeds → briefing → Act; not “News”) |
| [ACC-CHANNEL-CONNECTIVITY.md](./ACC-CHANNEL-CONNECTIVITY.md) | Acc — OTA channels (iCal → Booking.com / Airbnb APIs) |
| [CONNECTOR-ENGINE.md](./CONNECTOR-ENGINE.md) | **Core** — Connector Framework; Property / Business / Marketing; Listing Hub parent |
| [CONNECTOR-PRIORITY.md](./CONNECTOR-PRIORITY.md) | **Core** — Tier 1–10 stack, DigitalGate 15, immediate programme, anti-priorities |
| [PROPERTY-SYNDICATION.md](./PROPERTY-SYNDICATION.md) | RE — Listing Hub / Property Syndication (Domain → REA → portals) |

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
