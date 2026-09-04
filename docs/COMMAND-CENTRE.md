# DigitalGate Command Centre

**The Operator OS DigitalGate uses to run DigitalGate**

**Version:** 1.2  
**Last updated:** September 2026  
**Status:** **Closed beta / active operator surface** — current implementation remains subject to the Gen 2 Platform Completion Audit and LIVE verification.

**Architecture:** DigitalGate is the platform operator, not a customer tenant. See [foundations/OPERATOR-OS.md](./foundations/OPERATOR-OS.md).

---

## What it is

The **DigitalGate Command Centre** is an **internal-only operator control plane**. It is not a customer section, not a super-admin page bolted onto the customer product, and not a DigitalGate customer workspace with extra permissions.

It exists so authorised DigitalGate operators can understand and operate the platform across tenants while maintaining strict server-side authorisation, least privilege and auditability.

Typical responsibilities include:

- platform overview and operating priorities
- organisation / tenant oversight
- subscriptions and revenue intelligence
- platform and integration health
- usage and adoption intelligence
- provisioning and lifecycle operations
- AI / automation operations
- support oversight
- feature rollout and platform controls
- cross-tenant operational intelligence where explicitly authorised

Customers never see the Command Centre. They use their organisation workspace — Business Overview, Core, Growth, Industry Apps and Platform capabilities.

---

## Two distinct products

### 1. Organisation workspace — customer

Every organisation sees and operates **its own business**.

| Area | Examples |
|------|----------|
| Overview | briefing, priorities, Business Health, recommended actions |
| Core | Contacts, Companies, Opportunities, Tasks, Communications, Documents |
| Growth | SEO, AI Visibility, Automation, Prospecting, Analytics, Reputation |
| Industry | Real Estate, Accommodation, Finance, Services, etc. |
| Platform | websites, integrations, billing, users, settings, support |

**Primary route:** `/dashboard` and installed Apps  
**Audience:** tenant users within their authorised organisation scope

Business Brain and AI Advisor belong primarily here because they reason about **the customer's business**.

### 2. Command Centre — DigitalGate operator

DigitalGate staff only.

**Primary route:** `/command/*`  
**Audience:** authorised DigitalGate operators

The operator experience should be visibly distinct enough that a user always knows they are operating **DigitalGate the platform**, not a customer business.

Primary operator areas should converge on:

| Area | Purpose |
|------|---------|
| **Overview / Priorities** | What requires operator attention now |
| **Organisations** | Tenant lifecycle, health, status, provisioning and authorised drill-down |
| **Revenue** | subscriptions, MRR/ARR, churn, conversion and billing exceptions |
| **Platform Health** | application, integrations, infrastructure, jobs and failure signals |
| **Usage & Adoption** | feature use, onboarding, retention and workflow adoption |
| **AI & Automation Ops** | automation failures, AI usage, recommendations and operational controls |
| **Support Oversight** | customer issues, service risk and escalation |
| **Platform Controls** | feature rollout, beta access and other privileged operations |
| **Platform Intelligence** | understanding the platform, fleet and operating state with citations / evidence |

The completion programme may **KEEP / MOVE / MERGE / RENAME / REDIRECT / REMOVE / REBUILD** existing `/command/*` routes to reach this canonical model. Existing route presence is not proof a module is LIVE.

---

## Operator intelligence

Command Centre should not merely expose more tables than the customer interface. It should answer:

> **What is happening across DigitalGate? → Does it matter? → What should we do?**

Examples:

- Which tenants require intervention?
- Are provisioning or integrations failing?
- Which customers are at churn risk or under-adopting valuable capabilities?
- What changed in revenue, usage or platform health?
- Are automations or scheduled jobs failing?
- Are there recurring product problems worth fixing globally rather than handling tenant by tenant?

The same product principle applies internally:

> **Complex underneath. Simple on top.**

---

## DigitalGate Success / customer health intelligence

Customer-health scoring may combine appropriate signals such as:

| Signal | Example relevance |
|--------|-------------------|
| Platform usage | adoption / value realisation |
| AI Visibility | growth visibility |
| SEO | discoverability |
| Website Health | digital infrastructure quality |
| Automation adoption | operational leverage |
| Reviews / reputation | trust |
| Lead conversion | commercial effectiveness |
| Growth trend | direction of business outcomes |

Scores must always carry context and should lead to explainable recommendations rather than exist as vanity numbers.

---

## Native Gen 2 data boundary

```text
Platform Core / Neon (system of record)
        ↓
Canonical tenant objects + events
        ↓
Business Brain / scoring / intelligence
        ↓
Tenant intelligence                  Operator intelligence
        ↓                                      ↓
Organisation workspace                       Command Centre
```

**Normal production runtime has zero WordPress dependency.** WordPress is retained only as a temporary migration connector for onboarding legacy clients: WordPress → Gen 2 → validate → cut over → disconnect.

Accordingly, Command Centre health must distinguish between:

- **native Gen 2 runtime health** — production application, database, jobs, authorised connectors, websites, integrations and services
- **migration connector health** — relevant only while a legacy customer's migration is actively in progress

A WordPress connector being unavailable is **not** a normal operational health condition for a fully native tenant such as Currumbin Valley Hideaway.

---

## Business Brain / knowledge relationship

Command Centre needs **platform/operator knowledge**, while each tenant has **organisation knowledge**.

See [foundations/BUSINESS-BRAIN-KNOWLEDGE.md](./foundations/BUSINESS-BRAIN-KNOWLEDGE.md).

The boundary is:

- **DigitalGate Business Brain knowledge** — DigitalGate strategy, platform decisions, operating knowledge and authorised business context
- **tenant Business Brain knowledge** — that organisation's business facts, decisions, goals, preferences, processes and approved intelligence context
- **Platform Intelligence** — operator-facing understanding of code, architecture, deployments, fleet health and documented platform behaviour

Command Centre may inspect tenant information only through explicitly authorised, audited operator workflows. It must never bypass tenant isolation merely because the UI is internal.

---

## Proactive operator loop

The same closed-loop intelligence pattern should operate inside Command Centre:

```text
Signal → Insight → Recommendation → Action → Outcome → Learning
```

Example:

> Three tenants have repeated automation failures from the same integration in the last 24 hours. This appears to be a platform-level issue rather than three separate customer problems. Review the shared failure pattern?

The machine identifies and organises the problem. The operator makes the consequential decision.

---

## Growth Engine™ and acquisition

DigitalGate's internal acquisition capability can remain within the operator environment where it genuinely belongs, but it must use canonical Platform Core concepts and avoid duplicating customer CRM foundations unnecessarily.

See [GROWTH-ENGINE.md](./GROWTH-ENGINE.md) for the detailed implementation/specification. During the completion audit each Growth Engine route should be assessed against the same canonical-object and double-handling rules as the rest of the platform.

---

## Platform Intelligence

Command Centre is also the natural surface for **DigitalGate Platform AI / Platform Intelligence**: fleet health, architecture, deployments, documented behaviour, incidents and operator-facing Q&A.

- Spec: [ai/PLATFORM-INTELLIGENCE.md](./ai/PLATFORM-INTELLIGENCE.md)
- Product split: **DigitalGate AI** (tenant — your business) vs **DigitalGate Platform AI** (platform / fleet)
- Responses should distinguish confirmed evidence from inference and retain citations/provenance
- Consequential actions require appropriate confirmation and auditability

Platform Intelligence and Business Brain Knowledge are complementary:

- Platform Intelligence understands **the platform and its runtime**.
- Business Brain understands **the organisation and its governed business knowledge**.

---

## Architecture

```text
                    ┌─────────────────────────┐
                    │ Command Centre          │
                    │ operator control plane  │
                    └───────────┬─────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ↓                       ↓                       ↓
  Platform services       Intelligence            AI Service
        ↓                       ↓                       ↓
  Canonical events       Business knowledge       Platform knowledge
        ↓                       ↓                       ↓
  Platform API / operator-scoped tools
        ↓
  Platform Core / PostgreSQL
```

### App registration

| Property | Value |
|----------|-------|
| ID | `command-centre` |
| Tier | `internal` |
| Visibility | `internal` |
| Manifest | `packages/platform-core/src/apps/builtins/command-centre.ts` |

Customer navigation must filter out internal/operator capability. Command Centre navigation remains a separate operator shell at `/command`.

### Access control

- server-side operator authorisation is mandatory
- operator role is distinct from Organisation Owner / Organisation Admin / Member
- `/command/*` must not rely on hidden navigation as security
- cross-tenant reads require an explicit staff/operator scope
- access to tenant PII or consequential tenant actions must be least-privilege and auditable
- tenant isolation remains an acceptance criterion even for internal tooling

---

## Relationship to other Apps

| Capability | Relationship |
|------------|--------------|
| Core / Growth / Industry Apps | canonical tenant data and operating signals |
| Scoring / intelligence | interprets relevant signals and produces explainable priorities |
| Business Brain Knowledge | governed organisational context for reasoning |
| Event architecture | shared source of material operational change |
| Connectors | authorised external signals; not alternate Gen 2 systems of record |
| Platform Intelligence | operator understanding of architecture, runtime and fleet state |
| Notifications | shared operator/customer attention architecture where appropriate |

The Command Centre does **not** duplicate CRM, Accommodation or Real Estate UIs. An operator may inspect intelligence and, where authorised, enter tenant context deliberately with clear visual scoping and auditability.

---

## Completion criteria

Command Centre is considered finished only when:

- operator vs tenant audience is unambiguous
- privileged routes are server-side authorised
- cross-tenant access is least-privilege and audited
- no normal-runtime WordPress dependency remains
- core operator workflows use canonical Platform Core data
- duplicate customer functionality has been removed or consolidated
- loading, empty, error and responsive states are complete
- platform health and operational priorities are genuinely actionable
- operator recommendations follow the proactive intelligence model
- production workflows are verified before being marked LIVE

---

## Related documents

- [COMMAND-CENTRE-BETA.md](./COMMAND-CENTRE-BETA.md) — historical/current beta implementation notes; reconcile during completion audit
- [ADR 0008 — Command Centre as internal App](./adr/0008-command-centre-internal-app.md)
- [GROWTH-ENGINE.md](./GROWTH-ENGINE.md)
- [foundations/BUSINESS-BRAIN-KNOWLEDGE.md](./foundations/BUSINESS-BRAIN-KNOWLEDGE.md)
- [foundations/INDUSTRY-INTELLIGENCE.md](./foundations/INDUSTRY-INTELLIGENCE.md)
- [ai/PLATFORM-INTELLIGENCE.md](./ai/PLATFORM-INTELLIGENCE.md)
- [foundations/OPPORTUNITY-ENGINE.md](./foundations/OPPORTUNITY-ENGINE.md)
- [PLATFORM-ARCHITECTURE.md](./PLATFORM-ARCHITECTURE.md)
- [ROADMAP.md](./ROADMAP.md)
