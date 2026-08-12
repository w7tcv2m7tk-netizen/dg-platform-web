# DigitalGate App Hierarchy (canonical)

**Status:** Locked · Platform Architect (Ben) · August 2026  
**Supersedes:** Any Industry-before-Infrastructure public/commercial ordering

> DigitalGate is an **operating platform with Apps** — not an App marketplace.

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

---

## 1. CORE — every business

CRM · Contacts · Opportunities · Tasks · Calendar · Documents · Communications · Commerce

## 2. INFRASTRUCTURE — operate digitally

Websites / Website Builder · Domains · DNS · Hosting · Email · SSL · Website Management · Backups · Cloudflare

## 3. INDUSTRY — specialised

Real Estate · Accommodation · Services · Finance · Commercial · Automotive · Creator · Future industries

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
| **Digital Twin** | Live business context |
| **Intelligence** | Scoring, briefing, recommendations |
| **Connectors** | External systems into Universal Objects |

Do **not** package these as purchasable “Apps” in the public hierarchy. They operate across the platform.

---

## Product stance

| Say | Don’t say |
|-----|-----------|
| Operating platform with Apps | App marketplace / app store story |
| Core → Infrastructure → Industry → Growth | Industry before Infrastructure |
| Infrastructure powers digital presence | Domains/hosting as a separate product category from the OS |
| Industry Apps specialise the same foundation | Separate industry products / siloed stacks |
| Growth Apps for visibility & conversion | Automation as a Growth App (Automation is platform capability) |

---

## Related

| Doc | Relationship |
|-----|----------------|
| [CAPABILITY-MODEL.md](../CAPABILITY-MODEL.md) | Capability ↔ App packaging; must not contradict this hierarchy |
| [COMMERCIALLY-READY-V1.md](./COMMERCIALLY-READY-V1.md) | Commercialisation build order (🔴/🟠/🟢) — orthogonal to App hierarchy |
| [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) | Infrastructure layer detail |
| [WEBSITE-BUILDER.md](./WEBSITE-BUILDER.md) | Website Builder sits under Infrastructure |
| [strategy/DIGITALGATE-ROLLOUT.md](../strategy/DIGITALGATE-ROLLOUT.md) | Public GTM language |
| Marketing homepage + pricing | Public surfaces for this hierarchy (`dg-platform/marketing/pages/`) |
| [COMMERCIAL-MODEL.md](./COMMERCIAL-MODEL.md) | Platform / Apps / Services / Success / intelligence layer lock |
