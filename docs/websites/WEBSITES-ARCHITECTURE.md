# Websites Architecture

**AI-native web presence — studio, health, content, and funnels**

**Version:** 0.1  
**Last updated:** August 2026  
**Status:** Design — manifest registered; implementation Phase 2+

**Related:** [CAPABILITY-MODEL.md](../CAPABILITY-MODEL.md) · [ai/AI-ARCHITECTURE.md](../ai/AI-ARCHITECTURE.md) · [infrastructure/INFRASTRUCTURE-ARCHITECTURE.md](../infrastructure/INFRASTRUCTURE-ARCHITECTURE.md)

---

## Strategic intent

DigitalGate does **not** build another generic drag-and-drop page builder.

It delivers an **AI Website Studio** — onboarding-driven site generation with CRM-native integration, SEO/AI Visibility baked in, and proactive site management.

**Principle:** Own the experience and business outcomes. Use established providers for hosting compute, CDN, and codegen backends where appropriate.

---

## Modules

### AI Website Studio

Onboarding collects industry, services, locations, brand assets. Generates site architecture, pages, copy, SEO metadata, schema, forms (→ CRM), and conversion funnels.

Flow: **Generate → Edit → Preview → Publish** (via Infrastructure App).

### Website Health Centre

Per connected site: Performance, SEO, AI Visibility, Accessibility, Security, Uptime, Core Web Vitals, broken links, SSL status, backups, plugin/update status (WordPress).

Proactive AI: *"Contact form stopped working. SSL expires in 21 days. Recommend two new suburb pages."*

### AI Content Studio

Blogs, service pages, suburb pages, social posts, emails, property descriptions, newsletters, FAQs — all draft → approve → publish. Feeds SEO and AI Visibility Apps.

### AI Funnel Builder

One prompt orchestrates landing page, thank-you page, email/SMS sequence, CRM pipeline, automations, optional chatbot/voice agent, analytics.

Meta-orchestrator composing Websites + CRM + Communications + Automation.

### AI Developer

Natural language → code diff → preview → **human review** → deploy. Orchestrates coding agents; does not reinvent them.

---

## Platform integration

| Object | Role |
|--------|------|
| `Document` | Pages, site config, generated copy |
| `Activity` | Publish events, health alerts |
| `Contact` / `Lead` | Form and funnel submissions |
| Infrastructure App | Domain, SSL, deploy |

Form path: webhook → Connector → Contact/Lead → Activity → Automation.

---

## Build phases

| Phase | Scope |
|-------|-------|
| 0 | Manifest + docs ✅ |
| 1 | Health Centre read-only (connected Roe/CVH URLs) |
| 2 | Content Studio v0 (draft → approve → WP publish) |
| 3 | Form → CRM webhook |
| 4 | Website Studio v0 (onboarding → preview → staging) |
| 5 | Funnel Builder v0 (RE appraisal template) |
| 6 | AI Developer v0 (NL edit + review) |
| 7 | Proactive site management |

**Dependency:** Platform 1.5 before Health Centre scores are meaningful.

---

## Code map (planned)

| Path | Purpose |
|------|---------|
| `packages/platform-core/src/apps/builtins/websites.ts` | Manifest ✅ |
| `packages/platform-core/src/websites/` | Orchestration |
| `src/app/apps/websites/` | UI |
| `src/app/api/v1/websites/` | API |

---

## Rules

1. Generated content is **draft by default**  
2. AI Developer requires **human review** before deploy  
3. Publishing flows through Infrastructure App  
4. WordPress stays a Connector for existing sites  

**Manifest:** `packages/platform-core/src/apps/builtins/websites.ts`
