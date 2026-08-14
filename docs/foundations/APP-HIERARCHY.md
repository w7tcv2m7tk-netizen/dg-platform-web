# DigitalGate App Hierarchy (canonical)

**Status:** Locked · Platform Architect (Ben) · August 2026  
**Supersedes:** Any Industry-before-Infrastructure public/commercial ordering

> DigitalGate is an **intelligent business operating platform** with Apps as **capabilities underneath** — not an App marketplace, and **not** sold primarily as a collection of apps.  
> Product story: [INTELLIGENT-LAYER.md](./INTELLIGENT-LAYER.md).

---

## Canonical order

```
CORE → INFRASTRUCTURE → INDUSTRY → GROWTH
```

| Layer | Logic | Role |
|-------|--------|------|
| **Core** | run | Every business operates here |
| **Infrastructure** | power | Operate digitally (web, domains, email, hosting) |
| **Industry** | specialise | Vertical workflows on the same foundation |
| **Growth** | grow | Visibility, acquisition, conversion |

### High-level architecture

```
DIGITALGATE PLATFORM
        ↓
      CORE
        ↓
 INFRASTRUCTURE
        ↓
  INDUSTRY APPS
        ↓
   GROWTH APPS
```

**Across everything (not Apps):** AI · Automation · Event Bus · Digital Twin · Intelligence · Connectors — platform capabilities that power Core and Apps.

**North-star intelligent layer:** [INTELLIGENT-LAYER.md](./INTELLIGENT-LAYER.md) — Connect → Centralise → Understand → **Decide** → Act → **Learn** → Grow; moat **Twin → Intelligence → Action → Learning**; Industry Apps as entry points. Target IA: BUSINESS · OPERATE · GROW · INTELLIGENCE · ECOSYSTEM. Real Estate = flagship commercial proof.

---

## 1. CORE — every business

CRM · Contacts · Opportunities · Tasks · Calendar · Documents · Communications · Commerce

## 2. INFRASTRUCTURE — operate digitally

Websites / Website Builder · Domains · DNS · Hosting · Email · SSL · Website Management · Backups · Cloudflare

## 3. INDUSTRY — specialised

**Property ecosystem (locked):** Real Estate (Sales) · Property Management · Commercial Property · Accommodation · Property Development (future) — see [PROPERTY-ECOSYSTEM.md](./PROPERTY-ECOSYSTEM.md)

Also: Services · Finance · Automotive · Creator · Future industries

Commercial honesty: not every Industry App is fully developed. Real Estate is the flagship; others ship with explicit Early Access / Coming Soon status.

## 4. GROWTH — visibility / acquisition / conversion

AI Visibility · SEO Engine · Analytics · Social Management · AI Communications · Reviews · Prospecting / Opportunity Engine (where appropriate)

---

## Platform capabilities (NOT Apps)

| Capability | Role |
|------------|------|
| **AI** | Assist, score, recommend, generate |
| **Automation** | Workflows across Core and Apps |
| **Event Bus** | Platform events between modules |
| **Digital Twin** | Living representation of the business |
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
| Core → Infrastructure → Industry → Growth | Industry before Infrastructure |
| Infrastructure powers digital presence | Domains/hosting as a separate product category from the OS |
| Industry Apps specialise the same foundation | Separate industry products / siloed stacks |
| Real Estate first commercial proof | Equal build effort across every Industry App |
| Growth Apps for visibility & conversion | Automation as a Growth App (Automation is platform capability) |

---

## Related

| Doc | Relationship |
|-----|----------------|
| [CAPABILITY-MODEL.md](../CAPABILITY-MODEL.md) | Capability ↔ App packaging; must not contradict this hierarchy |
| [INTELLIGENT-LAYER.md](./INTELLIGENT-LAYER.md) | Twin / BI / Advisor / AI Actions north-star — capabilities across the hierarchy |
| [COMMERCIALLY-READY-V1.md](./COMMERCIALLY-READY-V1.md) | Commercialisation build order (🔴/🟠/🟢) — orthogonal to App hierarchy |
| [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) | Infrastructure layer detail |
| [WEBSITE-BUILDER.md](./WEBSITE-BUILDER.md) | Website Builder sits under Infrastructure |
| [strategy/DIGITALGATE-ROLLOUT.md](../strategy/DIGITALGATE-ROLLOUT.md) | Public GTM language |
| Marketing homepage + pricing | Public surfaces for this hierarchy (`dg-platform/marketing/pages/`) |
| [COMMERCIAL-MODEL.md](./COMMERCIAL-MODEL.md) | Platform / Apps / Services / Success / intelligence layer lock |
