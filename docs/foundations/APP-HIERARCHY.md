# DigitalGate App Hierarchy (canonical)

**Status:** Locked · Platform Architect (Ben) · August 2026  
**Supersedes:** Any Industry-before-Infrastructure public/commercial ordering; flat “17 Industry Apps” model  
**Industry detail:** [INDUSTRY-PLATFORM.md](./INDUSTRY-PLATFORM.md)

> DigitalGate is an **intelligent business operating platform** with Apps as **capabilities underneath** — not an App marketplace, and **not** sold primarily as a collection of apps.  
> Product story: [INTELLIGENT-LAYER.md](./INTELLIGENT-LAYER.md).

---

## Canonical order

```
CORE → INFRASTRUCTURE → INDUSTRY → SPECIALISATION → TEMPLATE → GROWTH → INTELLIGENCE
```

| Layer | Logic | Role |
|-------|--------|------|
| **Core** | run | Every business operates here |
| **Infrastructure** | power | Operate digitally (web, domains, email, hosting) |
| **Industry** | specialise | Industry Platforms (Property, Finance, Services, …) |
| **Specialisation** | focus | Business type within an Industry |
| **Template** | configure | Objects, pipelines, workflows, AI context, terminology |
| **Growth** | grow | Visibility, acquisition, conversion |
| **Intelligence** | understand | Twin, Business Brain, Advisor, Health, Insights |

### High-level architecture

```
DIGITALGATE PLATFORM
        ↓
      CORE
        ↓
 INFRASTRUCTURE
        ↓
 INDUSTRY PLATFORM
        ↓
   SPECIALISATION
        ↓
      TEMPLATE
        ↓
   GROWTH APPS
        ↓
  INTELLIGENCE
```

**Across everything (not Apps):** AI · Automation · Event Bus · Digital Twin · Business Brain · Intelligence · Connectors — platform capabilities that power Core and Apps.

**North-star intelligent layer:** [INTELLIGENT-LAYER.md](./INTELLIGENT-LAYER.md) — Connect → Centralise → Understand → **Decide** → Act → **Learn** → Grow; moat **Twin → Intelligence → Action → Learning**. Target IA: BUSINESS · OPERATE · GROW · INTELLIGENCE · ECOSYSTEM. Real Estate = flagship commercial proof under **Property**.

---

## 1. CORE — every business

**Customer sidebar order (day-one Core):** Business · CRM · **Communications** · Documents · Commerce · Design Studio

CRM · Contacts · Opportunities · Tasks · Calendar · **Communications** · **Documents** (Documents & Signing) · Commerce · Billing · Team · Permissions · Reporting

Workflow logic: **Know → Communicate → Document → Transact**.

**Documents** is the Core nav app; **Documents & Signing** is the capability (Document Engine + Signing Engine). Industry Apps consume it with templates; do **not** place e-sign under Infrastructure. See [DOCUMENTS-AND-SIGNING.md](./DOCUMENTS-AND-SIGNING.md).

**Communications** is the Core nav app for the business communication layer (Communication Record · History · mailbox orchestration · Assist). Do **not** build a Gmail/Outlook clone; Google/Microsoft remain authoritative mailboxes. Do **not** invent a second customer “AI Communications” product that silos voice/email from Core history — voice agents may still commercialise as Growth capacity, but **history and association belong to Core Communications**. See [COMMUNICATIONS.md](./COMMUNICATIONS.md). **Live:** Communications home · Compose · Sent · Scheduled · Automations · Signature Studio · History · Gmail OAuth + sync · Inbox · Connected Services. Growth AI Communications soft-hidden from sidebar. **Next:** Microsoft · Assist drafts · Communication Health.

### Connected Services vs Connector Engine (customer vs operator)

| Audience | Label | Experience |
|----------|-------|------------|
| **Customer** | **Connected Services** (Settings) | Human cards: Google Workspace · Microsoft 365 · Stripe · REA · Domain · WordPress… Connected / Connect · last sync. No OAuth jargon. |
| **DigitalGate operator** | **Connectors / Connector Engine** | Scopes, probes, auth kinds, platform-ready, health, credentials. |

Google Workspace / Microsoft 365 are **first-class Connected Services** (Gmail/Outlook · Calendar · Contacts over time) — not “just email plugins.” Providers stay invisible; Universal Objects (Contact · Communication · Consultation/Task) are the abstraction.

### Founding Mode / progressive disclosure

Day one emphasises **Core + Intelligence** (Advisor · Business Health). Growth apps (Prospecting, SEO, Social, Reputation, Automation depth, AI Visibility…) are **progressively revealed** by goals, plan, and industry — not dumped in the sidebar as a flat catalogue. Implemented via `isFoundingCustomerMode` / `FOUNDING_MODE_CORE_APP_IDS` in `org-apps.ts`. **Connected Services** + **Communications home** are the day-one customer surfaces for mailbox connect and communication history — no separate progressive-reveal engine was added for the Core UX epic.
## 2. INFRASTRUCTURE — operate digitally

Websites / Website Builder · Domains · DNS · Hosting · Email · SSL · Website Management · Backups · Cloudflare · Connectors · Data · Identity

Infrastructure **Email** = digital presence / mailbox provisioning — not CRM email history or AI Assist.

## 3. INDUSTRY — Industry Platforms

Customer-facing: **Industry Apps**. Internally: **Industry → Template**.

| Industry App | Example Templates | Public lane |
|--------------|-------------------|-------------|
| **Property** | Real Estate · PM · Commercial · Development · Buyers Agency | Available |
| **Hospitality & Accommodation** | Short-Stay Accommodation · Hotels · F&B · Venues | Early Access |
| **Services** | Trades · Cleaning · Maintenance · Construction · Field | Available |
| **Finance** | Accounting (first) · Planning · Broking · Insurance · Advisory | Early Access |
| **Professional** | Legal · Surveying · Engineering · Architecture · Consulting | Coming Soon |
| **Retail & Commerce** | Retail · E-commerce · Wholesale · Distribution | Coming Soon |
| **Automotive** | Dealerships · Mechanical · Auto Services · Detailing | Coming Soon |
| **Creator & Media** | Creators · Music · Media · Artists | Early Access |
| Health & Wellness · Transport · Education · Agriculture | See [INDUSTRY-PLATFORM.md](./INDUSTRY-PLATFORM.md) | Coming / Reserved |

Commercial honesty: not every Industry or Template is fully developed. Real Estate is the flagship proof under Property. Accommodation lives under **Hospitality & Accommodation**.

**Do not** treat Commercial (enterprise segment) as an Industry App. **Do not** put Accommodation under Property. **Do not** build Legal or Surveying as standalone Industry Apps — they are Professional templates. **Do not** confuse Industry App Professional with DigitalGate’s own delivery Professional Services.

## 4. GROWTH — visibility / acquisition / conversion

AI Visibility · SEO Engine · Analytics · Social Management · Reviews · Prospecting / Opportunity Engine (where appropriate)

**AI Communications (legacy Growth app name):** commercial container for advanced voice agents / Call Centre / high-volume AI employees. Progressively **absorb into Core Communications → Calls / AI** for history and association; keep Growth packaging only for monetised agent capacity. Do not force customers to choose between “Email system” and “AI Communications system.”

## 5. INTELLIGENCE — understand the business

Digital Twin · Business Brain · AI Advisor · Business Health · Insights · Benchmarks · Command Centre · AI Actions

---

## Platform capabilities (NOT Apps)

| Capability | Role |
|------------|------|
| **AI** | Assist, score, recommend, generate |
| **Automation** | Workflows across Core and Apps |
| **Event Bus** | Platform events between modules |
| **Digital Twin** | Living representation of the business |
| **Business Brain** | Knowledge corpus for the organisation |
| **Decision Intelligence** | What matters / what next (uses the Twin) |
| **Opportunity Engine** | Detects and ranks opportunities (customer UI: Opportunities) |
| **Intelligence / Scoring** | Health, briefing, recommendations |
| **Connectors** | External systems into Universal Objects |

Do **not** package these as purchasable “Apps” in the public hierarchy. They operate across the platform. Customer story is the Intelligent Layer — not “buy six apps.”

---

## Product stance

| Say | Don’t say |
|-----|-----------|
| Intelligent operating platform; apps are capabilities | App marketplace / “SaaS bundle of tools” |
| Core → Infrastructure → Industry → Growth → Intelligence | Industry before Infrastructure |
| Industry App → Template | 17 separate Industry Apps as equal products |
| Property $99 with specialised templates | “All Property apps for $99” / five independent Property SKUs |
| Finance (Accounting first); Professional (Legal / Surveying templates) | “Accounting App” / “Legal App” / “Surveying App” as whole verticals |
| Accommodation under Hospitality & Accommodation | Accommodation under Property |
| Infrastructure powers digital presence | Domains/hosting as a separate product category from the OS |
| Real Estate first commercial proof under Property | Equal build effort across every Template |
| Growth Apps for visibility & conversion | Automation as a Growth App (Automation is platform capability) |

---

## Related

| Doc | Relationship |
|-----|----------------|
| [INDUSTRY-PLATFORM.md](./INDUSTRY-PLATFORM.md) | Industry → Specialisation → Template lock + commercial |
| [PROPERTY-ECOSYSTEM.md](./PROPERTY-ECOSYSTEM.md) | Property specialisations and modules |
| [CAPABILITY-MODEL.md](../CAPABILITY-MODEL.md) | Capability ↔ App packaging |
| [INTELLIGENT-LAYER.md](./INTELLIGENT-LAYER.md) | Twin / BI / Advisor / AI Actions |
| [COMMERCIALLY-READY-V1.md](./COMMERCIALLY-READY-V1.md) | Commercialisation build order |
| [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) | Infrastructure layer detail |
| [COMMERCIAL-MODEL.md](./COMMERCIAL-MODEL.md) | Platform / Apps / Services / Success |
| [strategy/DIGITALGATE-ROLLOUT.md](../strategy/DIGITALGATE-ROLLOUT.md) | Public GTM language |
