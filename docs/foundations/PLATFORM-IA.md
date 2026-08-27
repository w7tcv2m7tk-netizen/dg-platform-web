# DigitalGate Platform IA & Terminology

**Status:** Locked · August 2026  
**Job:** Prevent semantic drift. Protect the operating architecture.

The biggest risk is no longer missing features — it is inconsistent language across navigation, titles, breadcrumbs, CTAs, empty states, statuses, routes and permissions.

**Code locks:** `packages/platform-core/src/apps/navigation.ts` · `packages/platform-core/src/partners/ecosystem.ts` · Growth Engine workspace components  
**Related:** [OPERATOR-OS.md](./OPERATOR-OS.md) · [SIDEBAR-NAVIGATION.md](./SIDEBAR-NAVIGATION.md) · [GROWTH-ENGINE.md](../GROWTH-ENGINE.md) · [PARTNER-ECOSYSTEM.md](../partners/PARTNER-ECOSYSTEM.md)

---

## Master architecture (protect this)

```
DIGITALGATE
Business Operating Platform

COMMAND CENTRE          Run DigitalGate itself
  Priorities            What do I need to do?          Act
  AI Advisor            Help me understand and decide  Understand
  Alerts                What has gone wrong?           Monitor

SALES                   Acquire DigitalGate customers
  Overview
  Discovery             Prospect database / input
  Pipeline              Commercial progression
  Activity              Execution history
  Growth Engine™        The engine (Acquire → Qualify → Convert)
  Founding 10
  Sales Week
  Opportunities         Scoring / opportunity surface

PARTNERS                Scale distribution and delivery
  Dashboard · Ecosystem · Resellers · Onboarding
  Operating Model · Referrals · Commissions

CUSTOMER WORKSPACES     Run individual businesses
  CRM · Opportunities · Tasks · Calendar · Apps
  Business Brain · Digital Twin · …
```

| Surface | Job |
|---------|-----|
| **Command Centre** | Runs DigitalGate |
| **Sales** | Sells DigitalGate |
| **Partners** | Extends DigitalGate |
| **Customer Workspaces** | Runs the customer’s business |

Do not blur these four. Partners ≠ Sales. Command Centre ≠ customer Industry Apps.

---

## Command Centre nav (locked)

**Order:** Priorities → AI Advisor → Alerts  
**Mental sequence:** Act → Understand → Monitor  
**Default landing:** Priorities (`/command`)

---

## Sales / Growth Engine semantics (locked)

| Concept | Job |
|---------|-----|
| **Growth Engine™** | The commercial machine — orchestration layer |
| **Discovery** | Find businesses; bring them into the system |
| **AI Audit Engine™** | Understand digital position |
| **Opportunity Engine™ / Scoring** | Decide if there is a genuine opportunity |
| **Pipeline** | Move prospects through stages |
| **Activity** | Calls, notes, tasks, follow-ups (carries into CRM on convert) |
| **CRM** | Genuine business relationship after convert |

**Growth Engine phases:** Acquire → Qualify → Convert

Do **not** put “Prospecting” as the Growth Engine header synonym for Discovery. Internal route ids may still say `prospecting`; user-facing copy should not confuse Discovery with Growth Engine.

**Prospect ≠ CRM contact** until convert. Activity stays attached to the prospect identity through convert.

---

## Partner terminology (locked)

| Term | Meaning |
|------|---------|
| **Delivery Partner** | Authorised to implement |
| **Certified Delivery Partner** | Completed DigitalGate certification |
| **Active Delivery Partner** | Certified and currently operating |

**Lifecycle:** Applicant → Approved → Certified → Active

Commercial types remain: Founding Reseller · Delivery Partner · Technology Partner · Strategic Partner.

---

## Audit checklist (every change)

Check every:

- [ ] Navigation item  
- [ ] Page title  
- [ ] Breadcrumb  
- [ ] CTA / button  
- [ ] Sidebar label  
- [ ] Empty state  
- [ ] Status label  
- [ ] Terminology in body copy  
- [ ] Route / redirect  
- [ ] Permission / role label  
- [ ] Internal link  

…against this document. Prefer renaming UI copy over inventing a fifth synonym.

---

## Philosophy reinforcement

> DigitalGate doesn’t just manage customers. It operates the commercial system around the customer.

Command Centre operates DigitalGate. Sales acquires. Partners scale. Customer workspaces run the business.
