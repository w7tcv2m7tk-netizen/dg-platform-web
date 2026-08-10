# Services App — Industry-Configurable Field Operations

**Status:** Architecture locked · MVP job ops + day schedule board shipped (Aug 2026) · calendar / checklists / recurrence next  
**Classification:** **One Business App** with **Service Templates** — not separate Apps per trade  
**App id:** `services`  
**Related:** [CAPABILITY-MODEL.md](../CAPABILITY-MODEL.md) · [COMMERCE-SPECIFICATION.md](../commerce/COMMERCE-SPECIFICATION.md) · [BUSINESS-PROFILE.md](./BUSINESS-PROFILE.md) · [GLOBAL-READINESS.md](./GLOBAL-READINESS.md)
---

## Principle

**Do not** build Electrician, Plumber, Builder, Cleaner, Landscaper, HVAC, Pest Control, Painter, Handyman, Solar, Pool Service, etc. as separate DigitalGate Apps.

Build **one Services App**. Industry is **configuration**. The underlying business operating system stays DigitalGate Core.

> The industry is configuration; the operating system remains the same.

That scales internationally better than dozens of industry Apps.

---

## Shared workflow (Services Core)

```
Enquiry → Customer → Quote → Job → Schedule → Work → Invoice → Payment → Review
```

Differences between trades are mainly:

* Terminology  
* Fields  
* Workflows / stages  
* Job requirements  
* Compliance / checklists  
* Recurrence patterns  

---

## Architecture

```
                    DIGITALGATE PLATFORM CORE
                    (Auth · CRM · Commerce · Automation · AI · Events · …)
                              │
                       SERVICES APP
                    Jobs · Scheduling · Field Ops
                              │
                 Shared Service Engine
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   Jobs (owned)          Scheduling            Templates
                              │
                    Commerce · CRM · Settings
                    (Quotes · Customers · Teams)
```

```
Services App
│
├── Service Business (template key on Organisation / Business Profile)
│   ├── electrician | plumber | builder | cleaner | landscaper | …
│
├── Service Templates
│   ├── Workflow
│   ├── Fields
│   ├── Job Types
│   ├── Forms
│   ├── Automations
│   └── Reports
│
└── Shared DigitalGate Core
```

---

## Industry specialisation (via templates)

| Industry | Specialised functionality (template layer) |
|----------|--------------------------------------------|
| Electrician | Electrical job types, compliance, certificates |
| Plumber | Plumbing jobs, emergency call-outs |
| Builder | Projects, stages, variations, subcontractors |
| Cleaner | Recurring jobs, teams, checklists |
| Landscaper | Site visits, materials, recurring maintenance |
| HVAC | Service calls, equipment, maintenance |
| Pest Control | Treatments, recurring services |
| Painter | Quotes, rooms, materials, progress |
| Handyman | Multiple job categories |
| Solar | Site assessments, installations, maintenance |
| Pool Service | Recurring servicing, chemicals, equipment |

All sit on the **same Service Engine**.

---

## Template apply (example: Electrician)

When a business selects **Services → Electrician**, DigitalGate configures:

**Business Profile** → industry / vertical = electrician  

**Services catalogue** → installations, fault finding, switchboard upgrades, lighting, emergency call-outs  

**Job fields** → job type, site address, access, electrical requirements, compliance docs  

**Workflow** (example):

```
New Enquiry → Qualified → Site Visit → Quote → Approved → Scheduled
  → In Progress → Completed → Invoice → Paid → Review Request
```

A cleaner template might instead emphasise:

```
Enquiry → Quote → Booked → Scheduled → Cleaner Assigned
  → Completed → Recurring? → Review
```

---

## AI onboarding (powerful, later)

During onboarding, ask:

> What type of business do you operate?

Example: *“We’re a residential electrical business specialising in renovations and switchboard upgrades.”*

DigitalGate can auto-configure much of the Services App:

* services · terminology · job types · quote templates  
* workflows · forms · website structure · FAQs  
* automation · AI knowledge base · reporting KPIs  
* recommended integrations  

AI selects / customises a **Service Template**; it does not spawn a new App.

---

## Core objects (MVP direction)

Prefer Universal Objects + Commerce where possible:

| Concern | Prefer |
|---------|--------|
| Customer | **Contact** (+ company when needed) |
| Enquiry | **Lead** or Services Job draft |
| Quote / Invoice / Payment | **Commerce** |
| Job / Schedule | Services Job (+ Task / Activity timeline) — **day board + job editor shipped** |
| Review | **Reviews** App |
| Comms | Communications / Automation |

Introduce dedicated Job / Schedule models only when Contact + Task + Commerce are insufficient.

### MVP shipped (job ops slice)

* Job create/edit with template `jobFields` → metadata  
* Schedule start/end; auto-stage to `scheduled` when start set  
* Assignee from org memberships (Settings → Team)  
* Scheduling day board (next 14 days)  
* Soft Commerce quote links on job detail  

Still next: full calendar, checklists, recurrence, invoice auto-create.

---

## Explicit non-goals

* ❌ Separate App manifests per trade (`electrician`, `plumber`, …)  
* ❌ Duplicating CRM, Commerce, Auth, Billing, Automation per industry  
* ❌ Building all industry templates before Services Core MVP  

---

## Roadmap IDs

| ID | Item |
|----|------|
| `services.engine` | Shared Service Engine (jobs, quotes, schedule) |
| `services.templates` | Service Templates framework (workflow, fields, job types, …) |
| `services.template.electrician` | First vertical template (electrician) |
| `services.ai_configure` | AI onboarding → apply template from business description |

In-app: Settings → Roadmap.

---

## Placement

* **Business Apps** tier · one installable App: **Services**  
* Industry choice = template on Business Profile / org settings  
* Country Packs can localise compliance labels without new Apps ([GLOBAL-READINESS.md](./GLOBAL-READINESS.md))
