# The DigitalGate Principle (operator experience)

**Status:** Locked · Platform Architect (Ben) · August 2026  
**Code / UX must follow this** — architecture may grow; the operator surface must not.  
**Related:** [INTELLIGENT-LAYER.md](./INTELLIGENT-LAYER.md) · [ROLES-PERMISSIONS-SIDEBAR.md](./ROLES-PERMISSIONS-SIDEBAR.md) · [APP-HIERARCHY.md](./APP-HIERARCHY.md) · [BUSINESS-BRAIN.md](./BUSINESS-BRAIN.md)

---

## The principle (locked)

> **Simple for the operator. Powerful for the business. Intelligent underneath.**

Or:

> **One simple experience. An intelligent system underneath.**

**Complexity underneath. Simplicity on top.**

The mistake most business platforms make is exposing the architecture to the user. DigitalGate does the opposite: the more sophisticated the platform becomes, the simpler the operator’s experience should feel.

---

## Ultimate UX test

> If a user needs to understand how DigitalGate works **internally** before they can use a capability, the UX isn’t finished.

Operators should never need to know: Universal Objects, Event Bus, Model Router, Scoring Engine, Connectors, Automation Engine, PostgreSQL, APIs, webhooks, RAG, prompt templates, or context builders.

They should know:

> **“DigitalGate knows my business and helps me run it.”**

---

## Primary operator home (five centres)

The default day-to-day experience centres on outcomes — not modules:

| Centre | Operator question |
|--------|-------------------|
| **Overview** | How is my business doing? |
| **Priorities** | What needs my attention? |
| **Opportunities** | Where is the money / opportunity? |
| **AI Advisor** | What should I do? |
| **Apps** | What capabilities does my business have? |

Everything else sits **behind** those experiences (progressive disclosure). The sidebar is navigation — **not** the product. The workspace tells the operator what matters now.

Target: operators spend most of their time in Overview → Priorities → Opportunities → AI Advisor without touching configuration.

---

## Operator mode vs Administrator mode

| Mode | Who | Sees |
|------|-----|------|
| **Operator** | Business owner / team member | Overview, Priorities, Opportunities, Customers, Calendar, AI Advisor, activated Industry + Growth surfaces — hide most configuration |
| **Administrator** | Person who runs DigitalGate for the org | CRM config, automation builder, connectors, API, DNS, infrastructure, permissions, integrations, reporting config, AI config, templates, workflows, system settings |

Capability is not removed — it is revealed by role and need. This is progressive disclosure, not a second product.

---

## Simple → Advanced (every complex surface)

Default to outcome language and presets. Advanced unlocks the engine.

**Example — Automation**

- Simple: “What do you want to automate?” → follow up new leads · request reviews · stale opportunity reminders · appraisal follow-ups → *Create your own*
- Advanced: triggers, conditions, branches, delays, webhooks, events, rules

**Example — AI Communications**

- Simple: create a receptionist → answer · qualify · book · transfer
- Advanced: voice, model, tools, knowledge, webhooks, prompts, guardrails

Same underlying capability. Different first impression.

---

## AI as the interface to complexity

Operators increasingly describe outcomes in natural language; DigitalGate translates into CRM, opportunities, workflows, notifications, tasks, escalations, and reporting.

They should be able to say “make this happen” without assembling modules.

---

## Digital Twin as the abstraction layer

The Twin is not “another dashboard.” It is how DigitalGate understands *this* business so the operator experience stays familiar while Industry context differs (lending vs accommodation vs real estate).

Industry Apps should feel like **“DigitalGate understands my business”** — not a shopping cart of CRM + Industry + Templates + SEO + Automation.

Activate **Real Estate** → present a Real Estate workspace (vendors, buyers, appraisals, listings…). Universal Objects, CRM, automation, AI remain underneath.

---

## “Why am I seeing this?”

Every surface must justify presence:

- Inactive Industry / Growth Apps stay out of the way  
- Permissions hide billing, DNS, API, admin controls  
- Irrelevant modules do not appear “because they exist in the registry”

Roles, subscriptions, and activated Apps drive disclosure — see [ROLES-PERMISSIONS-SIDEBAR.md](./ROLES-PERMISSIONS-SIDEBAR.md).

---

## Recommended Actions

Prefer concrete next steps over dashboards of everything:

- What happened (signal)  
- Why it matters  
- **Do it for me** · **Show me how** · **Dismiss**

Command Centre / Advisor / Opportunity Engine deepen this pattern — they are the operating layer becoming tangible.

---

## Progressive reveal (Founding & onboarding)

Do not dump the full capability map on day one.

| Horizon | Experience |
|---------|------------|
| Day 1 | Connect profile, team, website, CRM, goals |
| Week 1 | Twin is ready — what DigitalGate understands |
| Week 2 | Opportunities found |
| Week 3 | What you could automate |
| Month 2+ | Improvement themes from live signals |

The platform demonstrates intelligence over time — not “here are 47 modules.”

---

## Relationship to other locks

| Lock | Relationship |
|------|----------------|
| [INTELLIGENT-LAYER.md](./INTELLIGENT-LAYER.md) | North-star loop (Connect → … → Learn). This doc is the **operator UX contract** for that loop. |
| [APP-HIERARCHY.md](./APP-HIERARCHY.md) | Commercial / capability stack. Operators feel Industry workspaces; hierarchy stays underneath. |
| [ROLES-PERMISSIONS-SIDEBAR.md](./ROLES-PERMISSIONS-SIDEBAR.md) | Access chain that enforces “why am I seeing this?” |
| Side panel IA | Navigation labels (Core → … → Platform Admin) serve discovery; they must not replace the five operator centres as the primary mental model. |

---

## Implementation rule for builders

1. Prefer outcome-first screens over module-first screens.  
2. Default to Operator mode; put configuration in Administrator / Advanced.  
3. Never require internal architecture literacy to complete a job.  
4. When adding power, add disclosure — not more default chrome.  
5. Recommended Actions beat another empty dashboard.

```
Architecture may grow indefinitely.
Operator experience must not grow with it.
```
