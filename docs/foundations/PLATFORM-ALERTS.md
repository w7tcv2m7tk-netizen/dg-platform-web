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
| **Operational load** | Morning operator dashboard — tasks, delivery, customers, critical count |
| **Infrastructure & Services** | Production API, domains, DNS, SSL, email — no raw provider diagnostics |
| **Commercial infrastructure** | Stripe health and billing checklist |
| **Connector health** | Healthy / Attention / Failed summary — detail behind View all connectors |
| **System diagnostics** | Sentry, env, DB — developer layer, not primary UI |

---

## Actionable alerts

Every alert includes:

- Impact statement
- Recommended action
- Investigate / Resolve / Assign actions

This turns Platform Alerts into an operating system, not a passive dashboard.

---

## Same philosophy, two levels

**Customer:**

Business Brain detects → Business Health identifies → AI Advisor explains → Recommended Actions prioritise → Command Centre executes.

**DigitalGate operator:**

Platform telemetry detects → Platform Intelligence identifies → Platform Alert generated → Delivery / Support / Engineering acts.
