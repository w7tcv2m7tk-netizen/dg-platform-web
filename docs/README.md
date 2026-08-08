# DigitalGate — Architecture Documentation Index

**Intellectual property for the DigitalGate Platform (Generation 2)**

These documents capture **why** the platform is built the way it is. They are as valuable as source code for onboarding, investors, partners, and future team members.

**Owner:** Founder & Platform Architect  
**Last updated:** August 2026

---

## Strategy & vision

| Document | Purpose |
|----------|---------|
| [CAPABILITY-MODEL.md](./CAPABILITY-MODEL.md) | Business Capabilities taxonomy + boundary rule |
| [PRODUCT-VISION.md](./PRODUCT-VISION.md) | Gateway brand, mission, five pillars, positioning |
| [foundations/GLOBAL-READINESS.md](./foundations/GLOBAL-READINESS.md) | Build globally / sell AU first — Country Packs + GTM stages |
| [foundations/NETWORK-LAYER.md](./foundations/NETWORK-LAYER.md) | Phase 5 — Community, B2B network, Marketplace (design now) |
| [foundations/REVIEWS-AND-REFERRALS.md](./foundations/REVIEWS-AND-REFERRALS.md) | Platform Refer & Earn (Core) vs Reviews + Business referrals (Phase 5+) |
| [ROADMAP.md](./ROADMAP.md) | Execution phases and priorities |
| [WP-DETACH-BACKLOG.md](./WP-DETACH-BACKLOG.md) | Sequenced Gen 2 ↔ WordPress detach tickets (P0–P5) |
| [COMMAND-CENTRE.md](./COMMAND-CENTRE.md) | Internal intelligence App — how DG runs DG |
| [RE-BETA-LAUNCH.md](./RE-BETA-LAUNCH.md) | Real Estate agency closed beta — in/out, provision, smoke test |
| [BUSINESS-OVERVIEW.md](./BUSINESS-OVERVIEW.md) | CEO dashboard — Business Overview at `/dashboard` |
| [PLATFORM-API.md](./PLATFORM-API.md) | REST API v1 — keys, auth, endpoints |
| [DEPLOY-WP-PLUGIN.md](./DEPLOY-WP-PLUGIN.md) | WordPress plugin deploy zip and site checklist |
| [GROWTH-ENGINE.md](./GROWTH-ENGINE.md) | Growth Engine™ — acquisition OS inside Command Centre |
| **[foundations/](./foundations/README.md)** | **Governance, domain model, commercialisation — read before implementing** |

---

## Architecture

| Document | Purpose |
|----------|---------|
| [PLATFORM-PRINCIPLES.md](./PLATFORM-PRINCIPLES.md) | Engineering constitution — non-negotiable defaults |
| [PLATFORM-ARCHITECTURE.md](./PLATFORM-ARCHITECTURE.md) | Core, Apps, Connectors, Twin, Graph, BI |
| [adr/](./adr/) | Architecture Decision Records — why we chose X over Y |

---

## Domain & data

| Document | Purpose |
|----------|---------|
| [catalogues/OBJECT-MODEL.md](./catalogues/OBJECT-MODEL.md) | Universal Objects — identity, commercial, operational, assets |
| [foundations/CONTACTS-AND-APP-ROLES.md](./foundations/CONTACTS-AND-APP-ROLES.md) | **ONE Contact** — app roles (Guest/Vendor/…) never duplicate people |
| [catalogues/EVENT-CATALOGUE.md](./catalogues/EVENT-CATALOGUE.md) | Domain events — names, payloads, producers, consumers |
| [domain/DOMAIN-MODEL.md](./domain/DOMAIN-MODEL.md) | Business domain language — entities, relationships, bounded contexts |

---

## Standards

| Document | Purpose |
|----------|---------|
| [standards/API-STANDARDS.md](./standards/API-STANDARDS.md) | Platform API conventions, versioning, auth |
| [standards/SECURITY-STANDARDS.md](./standards/SECURITY-STANDARDS.md) | Tenant isolation, audit, secrets, least privilege |
| [standards/CODING-STANDARDS.md](./standards/CODING-STANDARDS.md) | Repo layout, naming, PR expectations |
| [standards/PERFORMANCE-STANDARDS.md](./standards/PERFORMANCE-STANDARDS.md) | Latency targets, PWA phases, optimisation patterns |

---

## Services & integration

| Document | Purpose |
|----------|---------|
| [ai/AI-ARCHITECTURE.md](./ai/AI-ARCHITECTURE.md) | AI Service, Business Memory, tool registry |
| [ai/COMMUNICATIONS-ARCHITECTURE.md](./ai/COMMUNICATIONS-ARCHITECTURE.md) | AI Communications — voice, messaging, orchestration |
| [websites/WEBSITES-ARCHITECTURE.md](./websites/WEBSITES-ARCHITECTURE.md) | AI Website Studio, Health Centre, funnels, content |
| [infrastructure/INFRASTRUCTURE-ARCHITECTURE.md](./infrastructure/INFRASTRUCTURE-ARCHITECTURE.md) | Domains, hosting, DNS, SSL, deployments |
| [connectors/CONNECTOR-SPECIFICATION.md](./connectors/CONNECTOR-SPECIFICATION.md) | Connector contract — sync, auth, mapping |
| [design/DESIGN-SYSTEM.md](./design/DESIGN-SYSTEM.md) | UI package (`@dg/ui`), tokens, components |

---

## Role separation

| Role | Owns |
|------|------|
| **Founder & Platform Architect** (Ben) | What & why — vision, domain model, principles, roadmap |
| **Developers / AI agents** | How — implementation, schema detail, library choices |

Example: Architect decides **Event Bus exists**; developer chooses Inngest vs BullMQ.

---

## Document lifecycle

1. Propose change in PR or ADR draft  
2. Review against [PLATFORM-PRINCIPLES.md](./PLATFORM-PRINCIPLES.md)  
3. Update affected catalogues and standards  
4. Merge — docs and code ship together  

---

## Code cross-reference

| Doc area | Code location |
|----------|---------------|
| App manifests | `packages/platform-core/src/apps/` |
| Feature Registry | `packages/platform-core/src/features/` |
| Events | `packages/platform-core/src/events/` |
| Universal Objects | `packages/platform-core/src/objects/` + `packages/database/prisma/` |
| Digital Twin | `packages/platform-core/src/twin/` |
| Command Centre types | `packages/platform-core/src/command-centre/` |
| Knowledge Graph | `packages/platform-core/src/graph/` |
| Design System | `packages/ui/` |
