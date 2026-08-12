# DigitalGate — Architecture Documentation Index

**Intellectual property for the DigitalGate Platform (Generation 2)**

These documents capture **why** the platform is built the way it is. They are as valuable as source code for onboarding, investors, partners, and future team members.

**Owner:** Founder & Platform Architect  
**Last updated:** August 2026

---

## Strategy & vision

| Document | Purpose |
|----------|---------|
| **[architecture/GEN-2-ARCHITECTURE-BRIEF.md](./architecture/GEN-2-ARCHITECTURE-BRIEF.md)** | Gen 2 north-star — Core/UO/Connectors/AI constraints + Immediate Priority 1–15 |
| **[strategy/DIGITALGATE-ROLLOUT.md](./strategy/DIGITALGATE-ROLLOUT.md)** | **Canonical GTM / rollout** — Business OS positioning, pre-launch founding mode, Phases 1–12 ([ADR 0013](./adr/0013-gtm-rollout-strategy-adopted.md)) |
| **[foundations/COMMERCIALLY-READY-V1.md](./foundations/COMMERCIALLY-READY-V1.md)** | **Commercialisation operating target** — 5 founding agencies, pre-launch / founding GTM stance, Gates 1–4, pre-sell checklist |
| **[foundations/APP-HIERARCHY.md](./foundations/APP-HIERARCHY.md)** | **Canonical App hierarchy** — Core → Infrastructure → Industry → Growth (operating platform with Apps) |
| [CAPABILITY-MODEL.md](./CAPABILITY-MODEL.md) | Business Capabilities taxonomy + boundary rule |
| [PRODUCT-VISION.md](./PRODUCT-VISION.md) | Gateway brand, mission, five pillars, positioning |
| [foundations/GLOBAL-READINESS.md](./foundations/GLOBAL-READINESS.md) | Build globally / sell AU first — Country Packs + GTM stages |
| [foundations/NETWORK-LAYER.md](./foundations/NETWORK-LAYER.md) | Phase 5 — Community, B2B network, Marketplace (design now) |
| [foundations/REVIEWS-AND-REFERRALS.md](./foundations/REVIEWS-AND-REFERRALS.md) | Platform Refer & Earn (Core) vs Reviews + Business referrals (Phase 5+) |
| [foundations/WEBSITE-BUILDER.md](./foundations/WEBSITE-BUILDER.md) | Phase later — AI Website Studio; structured Next.js Gen 2 model (design now) |
| [foundations/INFRASTRUCTURE.md](./foundations/INFRASTRUCTURE.md) | Infrastructure layer — Domains/DNS/SSL/hosting; Dreamscape V1 |
| [foundations/EMAIL-INFRASTRUCTURE.md](./foundations/EMAIL-INFRASTRUCTURE.md) | Core — Email Service (Resend + Dreamscape mailbox; deliverability) |
| [ROADMAP.md](./ROADMAP.md) | Execution phases and priorities |
| [WP-DETACH-BACKLOG.md](./WP-DETACH-BACKLOG.md) | Sequenced Gen 2 ↔ WordPress detach tickets (P0–P5) |
| [COMMAND-CENTRE.md](./COMMAND-CENTRE.md) | Internal intelligence App — how DG runs DG |
| [RE-BETA-LAUNCH.md](./RE-BETA-LAUNCH.md) | Real Estate agency closed beta — in/out, provision, smoke test |
| [ACC-BETA-LAUNCH.md](./ACC-BETA-LAUNCH.md) | Accommodation property closed beta — CVH path, in/out, provision |
| [WEBSITES-BETA-LAUNCH.md](./WEBSITES-BETA-LAUNCH.md) | Website Builder closed beta — Studio, publish, WP content import |
| [INFRASTRUCTURE-BETA-LAUNCH.md](./INFRASTRUCTURE-BETA-LAUNCH.md) | Domains + Email E1 closed beta — SOAP search/connect/DNS/go-live |
| [COMMERCE-BETA-LAUNCH.md](./COMMERCE-BETA-LAUNCH.md) | Commerce closed beta — Stripe payments, quotes, invoices, reports |
| [COMMAND-CENTRE-BETA.md](./COMMAND-CENTRE-BETA.md) | Staff Command Centre closed beta — Growth Engine core |
| [BUSINESS-OVERVIEW.md](./BUSINESS-OVERVIEW.md) | CEO dashboard — Business Overview at `/dashboard` |
| [PLATFORM-API.md](./PLATFORM-API.md) | REST API v1 — keys, auth, endpoints |
| [DEPLOY-WP-PLUGIN.md](./DEPLOY-WP-PLUGIN.md) | WordPress plugin deploy zip and site checklist |
| [GROWTH-ENGINE.md](./GROWTH-ENGINE.md) | Growth Engine™ — acquisition OS inside Command Centre |
| [foundations/BUSINESS-DISCOVERY.md](./foundations/BUSINESS-DISCOVERY.md) | Core — Business Discovery Engine (providers, import, packs) |
| [foundations/OPPORTUNITY-ENGINE.md](./foundations/OPPORTUNITY-ENGINE.md) | Core — Opportunity Engine Daily Briefing (who today) |
| [foundations/INDUSTRY-INTELLIGENCE.md](./foundations/INDUSTRY-INTELLIGENCE.md) | Core — Industry Intelligence (feeds → briefing → Act; not “News”) |
| **[foundations/](./foundations/README.md)** | **Governance, domain model, commercialisation — read before implementing** |

---

## Architecture

| Document | Purpose |
|----------|---------|
| **[architecture/GEN-2-ARCHITECTURE-BRIEF.md](./architecture/GEN-2-ARCHITECTURE-BRIEF.md)** | **Canonical Gen 2 north-star** — §§1–36, Immediate Priority 1–15, alignment notes ([ADR 0012](./adr/0012-gen-2-architecture-brief-adopted.md)) |
| [PLATFORM-PRINCIPLES.md](./PLATFORM-PRINCIPLES.md) | Engineering constitution — non-negotiable defaults |
| [PLATFORM-ARCHITECTURE.md](./PLATFORM-ARCHITECTURE.md) | Core, Apps, Connectors, Twin, Graph, BI |
| [adr/](./adr/) | Architecture Decision Records — why we chose X over Y |
| [decisions/](./decisions/README.md) | Alias → `adr/` (Platform Knowledge SSOT path) |

### Docs SSOT tree (Platform Knowledge indexing)

Target folders for the Knowledge Layer (map gradually — see [ai/PLATFORM-INTELLIGENCE.md](./ai/PLATFORM-INTELLIGENCE.md)):

`architecture` · `core` · `universal-objects` · `apps/*` · `ai` · `automation` · `crm` · `websites` · `infrastructure` · `connectors/*` · `api` · `billing` · `permissions` · `troubleshooting` · `deployment` · `security` · `changelog` · `decisions/` (→ `adr/`)

Today’s layout (`foundations/`, `catalogues/`, `standards/`, …) remains authoritative until folders are promoted; do not mass-move without an ADR.

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
| [ai/PLATFORM-INTELLIGENCE.md](./ai/PLATFORM-INTELLIGENCE.md) | **Platform Intelligence Layer** — docs + live truth + tools (canonical) |
| [ai/COMMUNICATIONS-ARCHITECTURE.md](./ai/COMMUNICATIONS-ARCHITECTURE.md) | AI Communications — voice, messaging, orchestration |
| [websites/WEBSITES-ARCHITECTURE.md](./websites/WEBSITES-ARCHITECTURE.md) | AI Website Studio, Health Centre, funnels, content |
| [foundations/INFRASTRUCTURE.md](./foundations/INFRASTRUCTURE.md) | **Core** — domains/DNS/SSL/hosting via providers (Dreamscape first) |
| [infrastructure/INFRASTRUCTURE-ARCHITECTURE.md](./infrastructure/INFRASTRUCTURE-ARCHITECTURE.md) | Modules, phases (points to foundations doc) |
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
