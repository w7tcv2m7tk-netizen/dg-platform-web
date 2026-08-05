# DigitalGate Capability Model

**From Apps to Business Capabilities — the Digital Operating System map**

**Version:** 0.1  
**Last updated:** August 2026  
**Status:** Design — guides App registration and roadmap prioritisation

**Related:** [PRODUCT-VISION.md](./PRODUCT-VISION.md) · [PLATFORM-ARCHITECTURE.md](./PLATFORM-ARCHITECTURE.md) · [PLATFORM-PRINCIPLES.md](./PLATFORM-PRINCIPLES.md)

---

## Strategic shift

DigitalGate is not a CRM with add-ons. It is a **Digital Operating System** — the place where a business manages everything digital from one unified platform.

Customers still **buy and install Apps**, but internally we organise work by **Business Capability** — a coherent area of value the platform delivers.

```
DigitalGate Platform
├── Core Platform           ← multi-tenant foundation
├── Industry Apps           ← vertical workflows (Real Estate, Accommodation…)
├── Growth Apps             ← SEO, visibility, marketing, reviews
├── AI Apps                 ← studio, content, funnels, developer
├── Communications          ← voice, chat, email, SMS orchestration
├── Websites                ← AI Website Studio, health, site management
├── Commerce                ← payments, products (later)
├── Infrastructure          ← domains, hosting, DNS, SSL, deploy
└── Intelligence            ← Twin, scoring, BI, Command Centre
```

**Apps are the packaging.** Capabilities are the architecture.

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

---

## App ↔ Capability mapping

| Manifest ID | Tier | Capability group |
|-------------|------|------------------|
| `crm` | core | Core Platform |
| `real-estate` | business | Industry Apps |
| `seo` | growth | Growth Apps |
| `ai-visibility` | growth | Growth Apps |
| `ai-communications` | growth | Communications |
| `websites` | growth | Websites |
| `infrastructure` | growth | Infrastructure |
| `command-centre` | internal | Intelligence |

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
