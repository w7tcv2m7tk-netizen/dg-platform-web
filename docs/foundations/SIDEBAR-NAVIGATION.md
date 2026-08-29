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
  Command Centre · Partners · Delivery · Customer Intelligence · Platform Intelligence · Commercial · Product · Support
  Platform Docs (trailing — how DigitalGate works; not customer Business Knowledge)

  Command Centre: Priorities · AI Advisor · Alerts
  Acquisition = Growth → Prospecting (not a DigitalGate “Sales” duplicate).
  Founding 10 / Sales Week remain as Command Centre / Prospecting deep links — not primary nav apps.
  Customer Intelligence: Portfolio (was Organisations) · Client Health · Client Activity · Opportunities · Attention Required
  Platform Intelligence: DigitalGate ecosystem health (distinct from customer alerts)

  Organisations is not a standalone sidebar app — Customer Portfolio is the staff intelligence surface.
  Command Centre is operator “what next?” — never placed under customer CORE.

CORE — Run your business
  Business · CRM · Communications · Documents · Commerce · Design Studio · Infrastructure

  Business is the operator-facing intelligence centre:
    Overview · Business Profile · Goals · Team · Health · Insights · Advisor · Reports
    Twin / Brain / Benchmarks = supporting layers (Overview deep links), not sidebar apps.

  Infrastructure (Domains, DNS, SSL, Hosting, Email, Backups, Cloudflare) is a Core capability,
  not a separate IA pillar.

  Intelligence is a **capability layer underneath Business** — not a CORE sidebar destination.
  Do not add CORE → Intelligence as a competing nav item.

INDUSTRY — Run your industry-specific operation
  (dynamic — activated Industry Apps / Templates only)

GROWTH — Grow your business
  Prospecting (sidebar) · AI Visibility ($99) · SEO ($99) · Automation ($49) · Analytics ($49) · Social ($79) · Reputation (Free)
  Prospecting product brand: Prospecting & Opportunity Engine™ ($99) — one acquisition OS
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

**Business** → CRM → Communications → Documents → Commerce → Design Studio → **Infrastructure**.

Business leads CORE — who you are and what to do next (Health · Insights · Advisor · Reports) — then operating apps — then foundation infra.

### INDUSTRY (dynamic)

- Only **activated** Industry Apps / Templates for the organisation.
- Industry App = **$99/mo** with **one** Template included; additional Templates **+$29/mo**.
- Each Industry module or Template add-on is its **own sidebar app** under **INDUSTRY** (e.g. Real Estate and Property Management are separate; Services Electrician and Cleaning are separate).
- Do **not** merge multiple Industry modules or Template add-ons into one combined app label.

### GROWTH / PLATFORM

Module trees follow the product surfaces already registered in App manifests (Inbox, Voice Agents, Builder, Run Log, Reputation Score™, etc.). **Prospecting** (sidebar) is the single acquisition OS — product brand **Prospecting & Opportunity Engine™** (`/apps/prospecting`). Do not add a DigitalGate **Sales** sidebar app that duplicates the same workflow.

**Intelligence** is absorbed into **CORE → Business** (Health · Insights · Advisor · Reports). Twin / Brain / Benchmarks remain supporting deep links — not sidebar apps and not a separate Intelligence IA section.

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

Primary **“what matters now?”** experience — Priorities, AI Advisor, and Alerts (staff). Acquisition (Founding 10, Sales Week, Growth Engine surfaces) lives under **Growth → Prospecting**, with Command Centre deep links. Customer “what next” lives under **CORE → Business** (Health · Insights · Advisor · Reports). Portfolio “Advise” opens Advisor with that organisation as context — one intelligence layer, not a second Advisor product. Ideal loop: Command Centre → Recommended Action → Action → Outcome.

Staff Command Centre remains gated to the DigitalGate operator org. Customer “what next” lands on **CORE → Business → Overview**, then Health / Insights / Advisor / Reports.

## Business Brain

Supporting intelligence layer (reachable from **CORE → Business → Overview**) — not a primary sidebar destination. Knowledge/context for AI — not a normal technical module. Powers Advisor, Command Centre, Overview, Recommended Actions, Communications, Health, Twin over time. See [BUSINESS-BRAIN.md](./BUSINESS-BRAIN.md) · [BUSINESS-BODY.md](./BUSINESS-BODY.md).

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
- **Command Centre** (staff) and **CORE → Business** (customers — including Health / Insights / Advisor / Reports) use the same horizontal pattern where multiple routes exist.
- Overflow: when an app has more than eight top-level routes **and** overflow is intentional (e.g. Partners), extras may collapse under **More ▾**. Do not use More to hide canonical Communications (or other Core) destinations — show the full tab set.

**Code:** `src/components/navigation/AppContextNav.tsx` · `AppHorizontalSubnav.tsx` · `src/components/SidebarNav.tsx` (flat app links)

**Uniformity rules (locked)**

- **Canonical ownership:** each URL has one category / section owner. Shared editors are fine; they must not change chrome.
- **`matchAlso`:** same-app deep links only (e.g. `/apps/websites/studio` under Websites). Never alias a Core URL under Platform Settings (or any other category).
- **Business Profile** = Core → Business → `/dashboard/business`. Settings has no Organisation tab.
- One horizontal subnav only — never paste page-level pill bars (`CommandCentreNav`, `PartnersAdminNav`, `GrowthEngineNav`, `InfrastructureNav`, etc.).
- Subnav routes belong to exactly one sidebar app. Do not list Prospecting Opportunities under Commercial, or Command Centre Priorities/Alerts under Platform Docs / Intelligence.
- Context title = sidebar app name (e.g. Commercial, Prospecting, Product).
- Customer Portfolio (`/command/clients`) belongs to **Customer Intelligence**, not a standalone Organisations app.
- Single-route apps (e.g. Platform Docs) show **no** horizontal subnav.
- Product Roadmap lives at `/command/product/roadmap` so Product tabs stay mounted.
- Staff **AI Advisor** lives under **Command Centre**. Customer **Advisor** lives under **CORE → Business**. Portfolio **Advise** opens Advisor with that organisation as context — do not add a third Advisor tab under Customer Intelligence.

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
