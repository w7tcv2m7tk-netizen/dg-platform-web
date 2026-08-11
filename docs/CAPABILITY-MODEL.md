# DigitalGate Capability Model

**From Apps to Business Capabilities — the Digital Operating System map**

**Version:** 0.1  
**Last updated:** August 2026  
**Status:** Design — guides App registration and roadmap prioritisation

**Related:** [architecture/GEN-2-ARCHITECTURE-BRIEF.md](./architecture/GEN-2-ARCHITECTURE-BRIEF.md) (Gen 2 north-star) · [PRODUCT-VISION.md](./PRODUCT-VISION.md) · [PLATFORM-ARCHITECTURE.md](./PLATFORM-ARCHITECTURE.md) · [PLATFORM-PRINCIPLES.md](./PLATFORM-PRINCIPLES.md)

---

## Strategic shift

DigitalGate is not a CRM with add-ons. It is a **Digital Operating System** — the place where a business manages everything digital from one unified platform.

Customers still **buy and install Apps**, but internally we organise work by **Business Capability** — a coherent area of value the platform delivers.

```
DigitalGate Platform
├── Your Business           ← Overview, profile, Apps & Billing, Marketplace, Network
├── Core · Platform         ← Business Services (Setup), CRM, Commerce, Websites, Infrastructure, Opportunities, Brand Studio, Industry Intelligence
├── Command Centre          ← cockpit — priorities / orchestrated opportunities (staff)
├── Growth & Intelligence   ← Reputation, AI Visibility, SEO, Analytics, Automation, Social, AI Comms…
├── Business Apps           ← install-driven verticals (RE, Accommodation, …)
└── Platform                ← Settings / administration
```

**Apps are the packaging.** Capabilities are the architecture. **Core owns Opportunities; Command Centre orchestrates them.** **Business Services** is the provider-agnostic Core capability; **Business Setup / Start Your Business** is the customer surface (launch stages: Identify → Register → Establish → Build → Connect → Grow) — not a Growth App, not an “ASIC App” — [foundations/BUSINESS-SETUP.md](./foundations/BUSINESS-SETUP.md). **Business Identity Service** merges ABR (+ later ASIC / domain / Google / user) into Business Profile. Connectors under Business Services: ABR, ASIC (AU registry), Domain/Hosting (Dreamscape), Google, Social. **AI Brand Studio** is Core (roadmap; sits in Build) — [foundations/BRAND-STUDIO.md](./foundations/BRAND-STUDIO.md). **Industry Intelligence** is Core (not “News”, not a standalone App initially) — Collect → Filter → Understand → Personalise → Act; Industry Apps define feed profiles; feeds AI Service, Search, Reporting, Notifications, Opportunity Engine / Command Centre — [foundations/INDUSTRY-INTELLIGENCE.md](./foundations/INDUSTRY-INTELLIGENCE.md). **Platform Intelligence** (Platform AI / Platform Knowledge) is the foundational Gen 2 layer for docs + live truth + tools — [ai/PLATFORM-INTELLIGENCE.md](./ai/PLATFORM-INTELLIGENCE.md); distinct from cohort [DIGITALGATE-INTELLIGENCE.md](./foundations/DIGITALGATE-INTELLIGENCE.md). **Reputation** is a Growth App (customer surface) on Core Universal Review plumbing — [foundations/REVIEWS-AND-REFERRALS.md](./foundations/REVIEWS-AND-REFERRALS.md). **Services** is one Business App with Service Templates (not Electrician/Plumber Apps) — [foundations/SERVICES-APP.md](./foundations/SERVICES-APP.md).

---

## The boundary rule

Before adding any feature, ask:

> **Would a business reasonably expect to manage this as part of its digital presence?**

| Answer | Action |
|--------|--------|
| **Yes** | Belongs in the DigitalGate ecosystem — as Core, App, Connector surface, or Shared Service |
| **No** | Stays external, or integrate via Connector only |

This keeps the vision ambitious without scope drift into unrelated tooling.

**Execution filter (current phase):** Does this strengthen **Platform Core** or the **Real Estate App**? If no, defer — even when the capability rule says yes.

---

## Orchestration principle

**Own the experience. Integrate specialist infrastructure.**

| DigitalGate owns | Providers own |
|------------------|---------------|
| UX, onboarding, business logic | Speech synthesis, STT |
| CRM / object context | Domain registrar APIs |
| Automations, scoring, recommendations | CDN, edge hosting |
| Prompt templates, approval gates | LLM inference |
| Deploy orchestration, health dashboards | Raw hosting compute |

Same pattern across Communications (ElevenLabs), Infrastructure (registrar API), Websites (AI codegen), and Hosting (Vercel/Cloudflare).

**Connector build order** (what to integrate when): [foundations/CONNECTOR-PRIORITY.md](./foundations/CONNECTOR-PRIORITY.md) — DigitalGate 15 + immediate programme. Platform value chain: Core → Connector Layer → Universal Objects → AI → Scoring → Automation → Command Centre → BI.

---

## App ↔ Capability mapping

| Manifest ID | Tier | Capability group |
|-------------|------|------------------|
| `crm` | core | Core Platform |
| `reviews` | growth | Reputation (Growth App; Core Universal Review plumbing) |
| `opportunities` | core | Opportunities |
| `real-estate` | business | Industry Apps |
| `seo` | growth | Growth Apps |
| `ai-visibility` | growth | Growth Apps |
| `analytics` | growth | Growth Apps |
| `automation` | growth | Growth Apps |
| `social` | growth | Growth Apps (publishing deferred) |
| `ai-communications` | growth | Communications (Voice AI deferred) |
| `websites` | core | Websites |
| `infrastructure` | core | Infrastructure |
| `command-centre` | internal | Intelligence (incl. Business Discovery Engine — see foundations/BUSINESS-DISCOVERY.md) |

---

## Build order (recommended)

| Phase | Focus |
|-------|-------|
| **1.0** | Core + CRM + RE v0 — system of record |
| **1.5** | RE properties, WP sync, scores read-only |
| **2.0** | Website Health Centre; AI Content Studio |
| **2.5** | Infrastructure — domains/DNS via API |
| **3.0** | AI Website Studio; AI Funnel Builder |
| **3.5** | Hosting management |
| **4.0** | AI Developer |

---

## Related architecture docs

| Capability | Document |
|------------|----------|
| Gen 2 Architecture Brief (north-star) | [architecture/GEN-2-ARCHITECTURE-BRIEF.md](./architecture/GEN-2-ARCHITECTURE-BRIEF.md) |
| Business Services · Business Setup | [foundations/BUSINESS-SETUP.md](./foundations/BUSINESS-SETUP.md) |
| Industry Intelligence (Core) | [foundations/INDUSTRY-INTELLIGENCE.md](./foundations/INDUSTRY-INTELLIGENCE.md) |
| Platform Intelligence (Platform AI / Knowledge) | [ai/PLATFORM-INTELLIGENCE.md](./ai/PLATFORM-INTELLIGENCE.md) |
| Opportunity Engine™ | [foundations/OPPORTUNITY-ENGINE.md](./foundations/OPPORTUNITY-ENGINE.md) |
| Connector Engine · Priority stack / DG15 | [foundations/CONNECTOR-ENGINE.md](./foundations/CONNECTOR-ENGINE.md) · [foundations/CONNECTOR-PRIORITY.md](./foundations/CONNECTOR-PRIORITY.md) |
| Communications | [ai/COMMUNICATIONS-ARCHITECTURE.md](./ai/COMMUNICATIONS-ARCHITECTURE.md) |
| Websites | [websites/WEBSITES-ARCHITECTURE.md](./websites/WEBSITES-ARCHITECTURE.md) |
| Infrastructure | [infrastructure/INFRASTRUCTURE-ARCHITECTURE.md](./infrastructure/INFRASTRUCTURE-ARCHITECTURE.md) |

---

## Related manifests

| App | Path |
|-----|------|
| Websites | `packages/platform-core/src/apps/builtins/websites.ts` |
| Infrastructure | `packages/platform-core/src/apps/builtins/infrastructure.ts` |
| AI Communications | `packages/platform-core/src/apps/builtins/ai-communications.ts` |
