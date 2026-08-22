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

```
CORE
  Business · CRM · Commerce · Design Studio

INFRASTRUCTURE
  Infrastructure (Domains, DNS, SSL, Hosting, Email, Backups, Cloudflare)

INDUSTRY
  (dynamic — activated Industry Apps / Templates only)

GROWTH
  Prospecting & Opportunity Engine ($99) · AI Visibility ($99) · SEO ($99) · Automation ($49) · Analytics ($49) · Social ($79) · AI Communications ($99) · Reputation (Free)

INTELLIGENCE
  Digital Twin · Business Brain · Business Health · Benchmarks · Insights · AI Advisor · Reports
  (Reasoning: Twin → Brain → Health/Benchmarks/Insights → Advisor → Command Centre; Reports branches as output)
  Analytics is a related evidence surface — not in this hierarchy.

DIGITALGATE (staff only)
  Command Centre · Organisations · Sales · Partners · Delivery · Customer Intelligence · Platform Intelligence · Commercial · Product · Support

PLATFORM (staff) / PLATFORM ADMIN (customers)
  Apps · Marketplace · Network · Settings · Roadmap* · Platform Docs*
  Customers also see Support under Platform Admin.
```

\* Roadmap and Platform Docs are DigitalGate-internal by default.

### CORE order

**Business** (Overview · Business Profile · Goals · Team) → CRM → Commerce → Design Studio.

Business leads CORE — who you are — then operating apps.

### INDUSTRY (dynamic)

- Only **activated** Industry Apps / Templates for the organisation.
- Industry App = **$99/mo** with **one** Template included; additional Templates **+$29/mo**.
- Do **not** invent separate $99 Apps per Template under the same Industry.
- Multiple Templates under one Industry App appear under that Industry label.

### GROWTH / INTELLIGENCE / PARTNERS / PLATFORM ADMIN

Module trees follow the product surfaces already registered in App manifests (Inbox, Voice Agents, Builder, Run Log, Reputation Score™, etc.). **Prospecting & Opportunity Engine** is the $99 Growth App (`/apps/prospecting`); DigitalGate staff GTM continues to use Command Centre Prospecting (`/command/growth-engine`).

---

## Role visibility (defaults)

| Audience | Sees | Hides (unless granted) |
|----------|------|-------------------------|
| **DigitalGate Owner** | Full operating environment including Partners, Founding 10, Platform Docs, Roadmap, Audit, API, all CC | — |
| **DigitalGate Staff / Admin** | Configurable by permission — not automatic Owner | Billing, API, Audit, platform config when not granted |
| **Customer Admin** | CORE, relevant Infrastructure, activated Industry + Growth, Intelligence | Partners; DG Roadmap / Platform Docs / internal admin tools |
| **Customer Member** | Relevant CORE / Industry / Growth; Intelligence (Twin, Advisor, Health, Brain) | API, DNS, Cloudflare, Automation Builder, Agent Builder, Billing, Connectors, Audit, org configuration |

Individual module permissions **override** defaults. Nav hide ≠ security — enforce at API.

---

## Command Centre

Primary **“what matters now?”** experience — Priorities, Recommended Actions, Alerts, Sales Week, Founding 10 (staff). Ideal loop: Command Centre → Recommended Action → Action → Outcome.

Staff Command Centre remains gated to the DigitalGate operator org. Customer “what next” landing deepens via Overview / Advisor / Health under the DigitalGate Principle.

## Business Brain

Visible under Intelligence. Knowledge/context layer for AI — not a normal technical module. Powers Advisor, Command Centre, Overview, Recommended Actions, Communications, Health, Twin over time. See [BUSINESS-BRAIN.md](./BUSINESS-BRAIN.md) · [BUSINESS-BODY.md](./BUSINESS-BODY.md).

## Platform Docs

DigitalGate **internal** knowledge. Separate from Organisation Business Knowledge. Do not expose internal docs to normal customers.

## Progressive disclosure

Simple path first; Advanced for control (Automation, AI Communications, Infrastructure). See [OPERATOR-EXPERIENCE.md](./OPERATOR-EXPERIENCE.md).

## Sidebar principle

The sidebar is **navigation**, not the product. The workspace answers “What matters to me?” The sidebar answers “Where can I go?”
