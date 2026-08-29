# Sidebar / Navigation (final UX + access model)

**Status:** Locked · Platform Architect (Ben) · August 2026  
**Code:** `packages/platform-core/src/apps/navigation.ts` · `packages/platform-core/src/access/nav-filter.ts` · `src/components/SidebarNav.tsx`  
**Related:** [OPERATOR-EXPERIENCE.md](./OPERATOR-EXPERIENCE.md) · [OPERATOR-OS.md](./OPERATOR-OS.md) · [ROLES-PERMISSIONS-SIDEBAR.md](./ROLES-PERMISSIONS-SIDEBAR.md) · [APP-HIERARCHY.md](./APP-HIERARCHY.md) · [INDUSTRY-PLATFORM.md](./INDUSTRY-PLATFORM.md)

---

## Purpose

Restructure the DigitalGate side panel so the platform can become increasingly powerful without becoming increasingly overwhelming.

> **Complexity underneath. Simplicity on top.**

The sidebar must be **capability-aware**. Do not expose every platform capability simply because it exists.

```
Platform capability
  → Organisation configuration
  → Activated Apps
  → Industry / Templates
  → User role
  → Permissions
  → Visible navigation
```

DigitalGate Owner/Admin may expose the full operating environment. Customer users only see what is relevant to their business and role.

**Implementation rule:** Navigation is generated from the same underlying capabilities — not a cosmetic hard-coded list. This allows DigitalGate to scale to hundreds of capabilities without feeling like a collection of disconnected apps.

---

## Canonical structure (locked)

Four customer pillars. Staff get an additional DigitalGate operator layer. Do not add more top-level categories.

```
DIGITALGATE · Platform Operator (staff only)
  Command Centre · Sales · Partners · Delivery · Customer Intelligence · Platform Intelligence · Commercial · Product · Support
  Platform Docs (trailing — how DigitalGate works; not customer Business Knowledge)

  Command Centre: Priorities · AI Advisor · Alerts (Sales Week / Founding 10 live under Sales)
  Customer Intelligence: Portfolio (was Organisations) · Client Health · Client Activity · Opportunities · Attention Required
  Platform Intelligence: DigitalGate ecosystem health (distinct from customer alerts)

  Organisations is not a standalone sidebar app — Customer Portfolio is the staff intelligence surface.
  Command Centre is operator “what next?” — never placed under customer CORE.

CORE — Run your business
  Business · CRM · Communications · Documents · Commerce · Design Studio · Infrastructure · Intelligence

  Infrastructure (Domains, DNS, SSL, Hosting, Email, Backups, Cloudflare) is a Core capability,
  not a separate IA pillar.

  Intelligence (single Core app — Overview is the primary entry)
    Hub journey: What’s happening → Why → What to do → Report
    Capability tabs unlock progressively after the customer opens them from Overview:
      Business Health · Insights · AI Advisor · Reports
    Supporting layers (hub links — not sidebar / not equal tabs):
      Digital Twin · Business Brain · Benchmarks
    The sidebar exposes the capability, not Twin → Brain → Health architecture.

INDUSTRY — Run your industry-specific operation
  (dynamic — activated Industry Apps / Templates only)

GROWTH — Grow your business
  Prospecting & Opportunity Engine ($99) · AI Visibility ($99) · SEO ($99) · Automation ($49) · Analytics ($49) · Social ($79) · Reputation (Free)
  (AI Communications is **not** customer sidebar — Assist lives under Core Communications → Write with AI / Calls)

PLATFORM — Manage DigitalGate for this organisation
  Apps · Marketplace · Network · Settings (+ Support trailing for customers)

  Apps — what is installed / enabled (Installed Apps · App Catalogue · Beta Programmes)
  Marketplace — what can be discovered / added (Industry · Growth · Integrations · Services · Partners)
    Do **not** list Core apps as Marketplace products — Core is already included.
    Do **not** show permission IDs or API capability strings on Marketplace cards.
    Distinct from Apps (installed) and Network (transactions / relationships).
  Network (customer) — relationships for *their* business:
    Overview · Referrals (B2B) · Refer & Earn (refer DigitalGate) · Connections
    Do **not** expose Resellers, Commissions, Ecosystem, or Programme Settings to ordinary customers.
    Earnings from Refer & Earn live inside Refer & Earn — not a generic Commissions area.

  Network (DigitalGate staff, Platform pillar) — commercial network *transactions*:
    Overview · Referrals · Commissions · Payouts
    Partners = people & organisations (DIGITALGATE → Partners). Network = transactions between them.
    Do **not** duplicate Referrals / Commissions under Partners. Room later: Attribution · Partner Revenue · Network Analytics · Marketplace.

  DIGITALGATE → Partners — relationship management:
    Dashboard · Ecosystem · Briefing · Resellers · Onboarding · Operating Model
    (+ More ▾ when overflow). Who are our partners — status, tier, certification, activity.

  Settings — administrative home (Overview · Users & Permissions · Billing · Connectors · API · Security · Notifications · Audit Log)

  **Business Profile** lives under **CORE → Business** (`/dashboard/business`) — not under Settings.
  Do not add a Settings “Organisation” tab that steals Business chrome.

  Staff DigitalGate org also uses Platform for tenant config. **Roadmap stays under Product** — not Platform.
  Business Knowledge lives inside Business Brain — not Platform Docs

Rule: customers see what they need to operate their business; DigitalGate staff see what they need to operate DigitalGate.
```

### CORE order

**Business** → CRM → Communications → Documents → Commerce → Design Studio → **Infrastructure** → **Intelligence**.

Business leads CORE — who you are — then operating apps — then foundation infra — then the brain.

### INDUSTRY (dynamic)

- Only **activated** Industry Apps / Templates for the organisation.
- Industry App = **$99/mo** with **one** Template included; additional Templates **+$29/mo**.
- Each Industry module or Template add-on is its **own sidebar app** under **INDUSTRY** (e.g. Real Estate and Property Management are separate; Services Electrician and Cleaning are separate).
- Do **not** merge multiple Industry modules or Template add-ons into one combined app label.

### GROWTH / PLATFORM

Module trees follow the product surfaces already registered in App manifests (Inbox, Voice Agents, Builder, Run Log, Reputation Score™, etc.). **Prospecting & Opportunity Engine** is the $99 Growth App (`/apps/prospecting`) for customers. DigitalGate staff GTM uses **Sales** under Operator OS (`/command/growth-engine`) — not a second Growth inject.

**Intelligence** is one CORE destination. Overview is primary; other surfaces reveal progressively — not seven sidebar links and not a separate Intelligence IA section.

**Platform** is four sidebar apps with horizontal subnav — not shell links plus Settings. Apps (install) and Marketplace (discover) stay distinct.

---

## Role visibility (defaults)

| Audience | Sees | Hides (unless granted) |
|----------|------|-------------------------|
| **DigitalGate Owner** | Full operating environment including Partners, Founding 10, Platform Docs, Roadmap, Audit, API, all CC | — |
| **DigitalGate Staff / Admin** | Configurable by permission — not automatic Owner | Billing, API, Audit, platform config when not granted |
| **Customer Admin** | CORE (incl. Infrastructure + Intelligence), activated Industry + Growth, Platform | Partners; DG Roadmap / Platform Docs / internal admin tools |
| **Customer Member** | Relevant CORE / Industry / Growth; Intelligence Overview (other surfaces unlock progressively) | API, DNS, Cloudflare, Automation Builder, Agent Builder, Billing, Connectors, Audit, org configuration |

Individual module permissions **override** defaults. Nav hide ≠ security — enforce at API.

---

## Command Centre

Primary **“what matters now?”** experience — Priorities, AI Advisor, and Alerts (staff). Sales Week and Founding 10 live under **Sales**. Customer Portfolio “Advise” opens Advisor with that organisation as context — one intelligence layer, not a second Advisor product. Ideal loop: Command Centre → Recommended Action → Action → Outcome.

Staff Command Centre remains gated to the DigitalGate operator org. Customer “what next” lands on **CORE → Intelligence → Overview**, then reveals Health / Insights / Advisor / Reports.

## Business Brain

Supporting intelligence layer (reachable from the Intelligence hub Overview) — not a primary sidebar destination. Knowledge/context for AI — not a normal technical module. Powers Advisor, Command Centre, Overview, Recommended Actions, Communications, Health, Twin over time. See [BUSINESS-BRAIN.md](./BUSINESS-BRAIN.md) · [BUSINESS-BODY.md](./BUSINESS-BODY.md).

## Platform Docs

DigitalGate **internal** product knowledge — how DigitalGate works. Lives under **DIGITALGATE → Platform Docs** for staff, not customer **Platform**. Separate from each organisation’s **Business Knowledge** in Business Brain. See [KNOWLEDGE-LAYERS.md](./KNOWLEDGE-LAYERS.md).

## Progressive disclosure

Simple path first; Advanced for control (Automation, AI Communications, Infrastructure). See [OPERATOR-EXPERIENCE.md](./OPERATOR-EXPERIENCE.md).

## Two-level navigation (August 2026)

The sidebar shows **sections and applications only** — no expandable route trees or ▾ toggles.

When you open an application, a **contextual horizontal sub-navigation** appears above the page content (wired globally via `AppContextNav` in `AppShellLayout`). Routes come from app manifests and `SIDEBAR_APP_DISPLAY` in `navigation.ts`, resolved by `resolveActiveAppNavigation()` in `active-nav.ts`.

```
Sidebar: CRM (single link)
Page top:  CORE / CRM / Contacts
           CRM
           Overview · Contacts · Companies · Opportunities · …
```

**Exceptions**

- **AI Conversations** (`/apps/ai-communications/*`): Communications top nav stays canonical (Inbox · Email · … · AI Conversations). Voice Agents, Call Centre, Agent Builder, Knowledge, and AI Settings render as a **secondary** hub nav on those pages only (`AiConversationsSubnav`).
- **Command Centre** (staff) and **CORE → Intelligence** (customers) use the same horizontal pattern where multiple routes exist.
- Overflow: when an app has more than eight top-level routes, extras collapse under **More ▾** (exception, not the default pattern).

**Code:** `src/components/navigation/AppContextNav.tsx` · `AppHorizontalSubnav.tsx` · `src/components/SidebarNav.tsx` (flat app links)

**Uniformity rules (locked)**

- **Canonical ownership:** each URL has one category / section owner. Shared editors are fine; they must not change chrome.
- **`matchAlso`:** same-app deep links only (e.g. `/apps/websites/studio` under Websites). Never alias a Core URL under Platform Settings (or any other category).
- **Business Profile** = Core → Business → `/dashboard/business`. Settings has no Organisation tab.
- One horizontal subnav only — never paste page-level pill bars (`CommandCentreNav`, `PartnersAdminNav`, `GrowthEngineNav`, `InfrastructureNav`, etc.).
- Subnav routes belong to exactly one sidebar app. Do not list Sales Opportunities under Commercial, or Command Centre Priorities/Alerts under Organisations / Platform Docs / Intelligence.
- Customer Portfolio (`/command/clients`) belongs to **Customer Intelligence**, not a standalone Organisations app.
- Single-route apps (e.g. Platform Docs) show **no** horizontal subnav.
- Context title = sidebar app name (e.g. Commercial, Sales, Product).
- Product Roadmap lives at `/command/product/roadmap` so Product tabs stay mounted.
- Staff **AI Advisor** lives under **Command Centre**. Customer **AI Advisor** lives under **CORE → Intelligence**. Portfolio **Advise** opens Advisor with that organisation as context — do not add a third Advisor tab under Customer Intelligence.

**Smoke test:** enter each major section overview, click every horizontal tab, confirm category label, section name, active sidebar item, subnav set, and page title stay in that section.

## Sidebar principle

Customer pillars communicate the product, not a SaaS inventory:

- **CORE** — run your business (body)
- **INDUSTRY** — specialised industry capabilities
- **GROWTH** — acquire and grow customers
- **PLATFORM** — manage this DigitalGate organisation

Intelligence is the brain inside Core. Infrastructure is foundation inside Core. Staff DigitalGate is a separate operator environment.

The sidebar exposes **capabilities**, not architecture. Twin → Brain → Health → Insights → Advisor can remain sophisticated underneath; customers should not have to learn that chain to use DigitalGate.

The sidebar is **navigation**, not the product. The workspace answers “What matters to me?” The sidebar answers “Where can I go?”
