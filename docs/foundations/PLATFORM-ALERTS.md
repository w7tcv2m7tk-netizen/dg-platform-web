# Platform Alerts

**Status:** Locked · August 2026  
**Route:** `/command/platform-health` (staff only)  
**Related:** [OPERATOR-OS.md](./OPERATOR-OS.md) · [COMMAND-CENTRE.md](../COMMAND-CENTRE.md)

---

## Principle

**Customer alerts** and **platform alerts** are different concepts and must be permission-controlled.

| Audience | Surface | Question |
|----------|---------|----------|
| **Customer** | Business Health / Command Centre | What needs attention in *my* business? |
| **DigitalGate staff** | Platform Alerts | What needs attention across the *platform*? |

Customer business alerts live in tenant Intelligence (Business Health predictive alerts, Recommended Actions). They must never mix with operator infrastructure diagnostics.

---

## Platform Alerts structure

### 🔴 Critical

Issues affecting customers, revenue, security or platform availability.

Examples: Stripe webhook failure, infrastructure degraded, critical delivery blockers.

### 🟠 Attention required

Staff intervention needed but not immediately critical.

Examples: stale connectors, customers requiring attention, onboarding blocked, overdue responses.

### 🔵 Platform notices

Operational information without immediate action.

Examples: test mode Stripe, infrastructure in setup/sandbox.

---

## Supporting sections

| Section | Purpose |
|---------|---------|
| **Platform status** | Glance answer — is DigitalGate OK? |
| **Operational status** | Executive metrics — tasks, delivery, customers, critical count |
| **Platform services** | Compact grid — API, domains, DNS, SSL, email, Stripe |
| **Legacy connectors** | Configured / failed / synced / idle — detach residue |
| **System diagnostics** | Sentry, env, DB — developer layer, not primary UI |

---

## Operator page jobs (do not blur)

| Page | Question | Role in the loop |
|------|----------|------------------|
| **Priorities** (`/command`) | What should I do? | **Act** — default Command Centre landing |
| **Alerts** | What needs attention? | **Investigate** — exceptions, blockers, platform issues |
| **AI Advisor** | Help me understand what to do | **Understand / Decide** — intelligence over Priorities + Alerts |

Flow: **Priorities → Alerts → AI Advisor** (Act → Investigate → Understand/Decide).

Do not put AI Advisor before Alerts. Alerts are operational; AI Advisor sits above that data.

Customer alerts stay in Client Intelligence / the organisation workspace.

---

## Actionable alerts

Every alert includes impact, recommended action, and **category-appropriate** actions.

| Alert type | Actions |
|------------|---------|
| Customer attention | Investigate · Client Intelligence · Assign |
| Legacy connectors | View organisations · Settings |
| Delivery | Investigate · Open Delivery · Assign |
| Billing / infra (clearable) | Investigate · Resolve · Assign |

Do **not** offer Resolve for alerts that acknowledging cannot clear (e.g. orgs needing attention).

---

## Same philosophy, two levels

**Customer:**

Business Brain detects → Business Health identifies → AI Advisor explains → Recommended Actions prioritise → Command Centre executes.

**DigitalGate operator:**

Platform telemetry detects → Platform Intelligence identifies → Platform Alert generated → Delivery / Support / Engineering acts.
