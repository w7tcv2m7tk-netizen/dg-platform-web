# Services App — DigitalGate Operating System for Service Businesses

**Status:** Architecture & product strategy locked · Aug 2026  
**Classification:** **One Business App** with **Service Templates** — not separate Apps per trade; **not** a standalone ServiceM8 clone  
**App id:** `services`  
**Benchmark:** ServiceM8-class operational coverage (AU field service) — use as a **capability checklist**, not a product clone  
**Related:** [INDUSTRY-PLATFORM.md](./INDUSTRY-PLATFORM.md) · [CAPABILITY-MODEL.md](../CAPABILITY-MODEL.md) · [COMMERCE-SPECIFICATION.md](../commerce/COMMERCE-SPECIFICATION.md) · [BUSINESS-PROFILE.md](./BUSINESS-PROFILE.md) · [APP-HIERARCHY.md](./APP-HIERARCHY.md) · [GLOBAL-READINESS.md](./GLOBAL-READINESS.md) · [SERVICES-BETA-LAUNCH.md](./SERVICES-BETA-LAUNCH.md)

---

## Commercial distinction (locked)

**Do not** make the product strategy: “Let’s build ServiceM8.”

**Do** make it:

> Build the **DigitalGate operating system for service businesses** — everything they need to run the business, connected to CRM, marketing, AI, automation, payments, and growth.

ServiceM8 is a useful **benchmark** for what modern Australian field-service applications must cover. DigitalGate wins by sitting on Platform Core — Universal Objects, Commerce, Communications, Automation, Analytics, Reputation, Websites — so the same customer twin powers enquiry → job → payment → review → nurture → upsell.

---

## Principle

**Do not** build Electrician, Plumber, Builder, Cleaner, Landscaper, HVAC, Pest Control, Painter, Handyman, Solar, Pool Service, etc. as separate DigitalGate Apps.

Build **one Services App**. Industry is **configuration** (Service Templates). The operating system stays DigitalGate Core.

> The industry is configuration; the operating system remains the same.

**Boundary:** Knowledge firms (legal, surveying, engineering, consulting) belong under the **Professional** Industry App — not Services. See [INDUSTRY-PLATFORM.md](./INDUSTRY-PLATFORM.md).

That scales internationally better than dozens of industry Apps — same pattern as Real Estate, Accommodation, Finance, Commercial.

```
Services App     → plumbers, electricians, HVAC, builders, cleaners, landscapers, pest, maintenance…
Real Estate App  → properties, listings, appraisals, vendors, buyers
Accommodation    → properties, rooms, bookings, guests, availability
Finance App      → clients, applications, lenders, commissions
Commercial App   → properties, tenants, leases, assets

Core Platform stays the same. The Industry App is the specialised operational layer.
```

---

## Architecture (locked)

```
DigitalGate Platform Core
  (Auth · CRM · Commerce · Automation · AI · Comms · Analytics · Events · …)
                              │
                       SERVICES APP
              Jobs · Scheduling · Field Ops · Templates
                              │
                 Shared Service Engine
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   Services-owned        Scheduling /          Service Templates
   objects (Job, …)      Dispatch UX           (trade configuration)
                              │
              Universal Objects + Core surfaces
   Contact · Company · Lead · Opportunity · Quote · Invoice · Payment
   Task · Activity · Document · Review · Comms
```

### Universal Objects (prefer Core — do not duplicate)

| Concern | Own in |
|---------|--------|
| Customers / contacts / companies | **CRM** (Contact, Company) |
| Customer history, notes, tags, timeline | **CRM** + Activity |
| Documents / attachments | **Documents** (Universal) |
| Communication history | **Communications** / Activity |
| Customer portal | **Portal** (Core) |
| Quotes / estimates / line items / GST / e-accept | **Commerce** |
| Invoices / deposits / payment status / reminders | **Commerce** |
| Payments / Stripe / links / refunds / receipts | **Commerce** |
| Enquiry / qualification | **Lead** → **Opportunity** |
| Tasks / follow-ups | **Task** |
| Reviews / nurture hooks | **Reviews** + Automation |
| Reporting (cross-app) | **Analytics** + Commerce reports |

Services **redirects** (already): Quotes → Commerce · Customers → CRM · Teams → Settings.

### Services-owned objects (add only when Core is insufficient)

| Object | Role |
|--------|------|
| **Job** | Work order — status, type, schedule, assignees, site, template fields |
| **Service Appointment** | Calendar occurrence / visit (may start as Job schedule fields) |
| **Technician** | Skills / availability profile (may start as org membership + metadata) |
| **Asset / Equipment** | Customer site assets (hot water, HVAC unit, …) |
| **Service Contract** | Recurring maintenance agreements |
| **Job Checklist** | Structured checklist instances per job |
| **Job Form** | Field forms / safety / certificates payloads |

---

## ServiceM8-class coverage map (capability checklist)

Cover the **operational expectations** of AU service businesses. Implementation uses Core where listed above.

| Domain | Expectation | DigitalGate surface |
|--------|-------------|---------------------|
| **1. Customers & CRM** | Customers, contacts, companies, history, notes, documents, comms, tags, portal | CRM + Documents + Portal |
| **2. Jobs** | Create, status, types, schedule, assign, recurring, history, notes, photos, docs, checklists | Services Job (+ Documents / checklist models) |
| **3. Scheduling & Dispatch** | Calendar, DnD, staff allocation, multi-tech, travel, availability, recurring, team calendars, mobile | Services Scheduling (day board shipped → calendar next) |
| **4. Quotes & Estimates** | Builder, templates, labour/materials, discounts, GST, approval, e-accept, quote→job | Commerce (+ Services conversion) |
| **5. Invoicing** | Invoices, deposits, progress, recurring, GST, status, online pay, reminders, Xero | Commerce (+ accounting connector later) |
| **6. Payments** | Stripe, cards, links, deposits, records, refunds, receipts | Commerce |
| **7. Field operations** | Mobile tech UI, instructions, before/after photos, signatures, checklists, forms, safety, time, materials, completion | Services field surfaces (later) |
| **8. Communications** | SMS, email, reminders, confirmations, job/quote/invoice updates | Communications + Automation |
| **9. Documents** | Job docs, quotes, invoices, certificates, photos, templates, digital forms | Documents + Commerce PDFs |
| **10. Reporting** | Revenue, jobs, quotes, conversion, tech performance, profitability, AR, acquisition, repeat | Analytics + Commerce reports + Services KPIs |

---

## Shared workflow

```
Enquiry → Customer → Quote → Job → Schedule → Work → Invoice → Payment → Review
```

**Platform advantage loop (target):**

```
New enquiry
  → AI identifies customer + requirement
  → Contact + Lead
  → Qualify → book appointment → assign technician → confirmation
  → Job complete → quote/invoice → payment
  → Xero (later) → review request → nurture
  → AI flags repeat / upsell Opportunity
```

Trade differences live in **templates**: terminology, fields, stages, job types, compliance checklists, recurrence patterns.

---

## Service Templates

When a business selects **Services → Electrician** (example), DigitalGate configures:

* Business Profile vertical  
* Catalogue / job types  
* Job fields & compliance  
* Workflow stages  
* Forms / automations / report KPIs  

Not a new App — the same Service Engine.

| Industry | Template emphasis (examples) |
|----------|------------------------------|
| Electrician | Compliance, certificates, switchboard / lighting types |
| Plumber | Emergency call-outs, hot water, blocked drains |
| Builder | Projects, stages, variations, subcontractors |
| Cleaner | Recurring jobs, teams, checklists |
| Landscaper | Site visits, materials, maintenance rounds |
| HVAC | Equipment, maintenance contracts |
| Pest Control | Treatments, recurring services |
| Painter | Rooms, materials, progress |
| Handyman | Multi-category jobs |
| Solar | Assessments, install, maintenance |
| Pool Service | Chemicals, equipment, recurrence |

---

## AI as a core differentiator (not a bolt-on)

AI is part of Services strategy — still phased; do not fake dispatch autonomy in beta.

| Capability | Intent |
|------------|--------|
| **AI Job Assistant** | Voice/notes → update job, notes, follow-up Opportunity, draft customer message, suggest upsell job |
| **AI Quote Assistant** | Natural language → structured Commerce quote for human review |
| **AI Scheduling** | Recommend slot from skills, location, duration, urgency, travel, existing bookings |
| **AI Customer Intelligence** | Twin across Customer → Jobs → Quotes → Invoices → Payments → Comms → Website |
| **AI template configure** | Onboarding description → apply/customise Service Template |

Honesty: closed beta has **no** autonomous AI dispatcher / GPS tracking. Declare tools; ship assistants behind review gates.

---

## Shipped vs next (honest)

### Closed-beta job ops (shipped)

* Service Templates apply (electrician / plumber / cleaner / …)  
* Job create/edit with template fields → metadata  
* Schedule start/end; auto-stage toward `scheduled`  
* Assignee from org memberships  
* Stages + notes  
* Scheduling **day board** (~14 days)  
* Soft Commerce quote links; redirects to CRM / Commerce / Team  

Playbook: [SERVICES-BETA-LAUNCH.md](./SERVICES-BETA-LAUNCH.md).

### Next product slices (ordered)

1. Calendar + drag-and-drop reschedule  
2. Structured checklists + photos on Job  
3. Recurring jobs / service contracts  
4. Quote→job conversion + invoice auto-create from job  
5. Field / mobile technician completion UX  
6. AI Job / Quote assistants (human-in-the-loop)  
7. Xero / accounting connector (Infrastructure/Commerce)  
8. AI scheduling recommendations  

---

## Explicit non-goals

* ❌ Separate App manifests per trade  
* ❌ Duplicating CRM, Commerce, Auth, Billing, Automation inside Services  
* ❌ Cloning ServiceM8 UX/branding as the product identity  
* ❌ Promising DnD calendar / GPS / AI dispatcher in closed beta  
* ❌ Building all industry templates before Services Core depth  

---

## Roadmap IDs

| ID | Item |
|----|------|
| `services.engine` | Shared Service Engine on Core + Universal Objects |
| `services.templates` | Service Templates framework |
| `services.template.electrician` | First vertical template |
| `services.jobs` | Jobs (create / status / assign / notes) — **done** slice |
| `services.scheduling` | Day board → full calendar / DnD |
| `services.field_ops` | Mobile / photos / signatures / checklists / time |
| `services.recurrence` | Recurring jobs + service contracts |
| `services.quote_job` | Quote↔job conversion + invoice from job |
| `services.ai_configure` | AI onboarding → template |
| `services.ai_job_assistant` | AI Job Assistant (human review) |
| `services.ai_quote_assistant` | AI Quote Assistant → Commerce |
| `services.ai_scheduling` | AI schedule recommendations |

In-app: Settings → Roadmap.

---

## Placement

* **Business Apps** tier · one installable App: **Services**  
* Industry choice = template on Business Profile / org settings  
* Country Packs localise compliance labels without new Apps ([GLOBAL-READINESS.md](./GLOBAL-READINESS.md))  
* Depth after founding validation is Gate 3 in [COMMERCIALLY-READY-V1.md](./COMMERCIALLY-READY-V1.md) — still build on this architecture when progressing Services
