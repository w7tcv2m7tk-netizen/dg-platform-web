# Services App closed beta — launch checklist

**Audience:** Ben (DigitalGate) + founding agencies on Services  
**Status:** Closed-beta **job ops ready** (Aug 2026) — run founding-agency dry-run before invite  
**Depends on:** Gen 2 with `DATABASE_URL`; Services App installed; org memberships for assignees  
**Architecture SSOT:** [SERVICES-APP.md](./SERVICES-APP.md)

This is **launch hygiene**, not a feature build. Product slice (template → job → schedule → stage → notes → day board) is already shipped.

---

## Who it’s for

Founding trade / field agencies that need:

- One **Services** App (not separate electrician / plumber Apps)
- Industry via **Service Template**
- Jobs, scheduling day board, stages, notes
- Quotes → Commerce, customers → CRM, team → Settings (redirects, not duplicates)

Not for: promising drag-drop calendars, GPS field tracking, or an AI dispatcher.

---

## Prerequisites

- [ ] Gen 2 env has `DATABASE_URL`; schema includes Services job tables
- [ ] Target org has **Services** App installed (App registry / enable path as used for other Business Apps)
- [ ] At least one org member in **Settings → Team** (needed to assign jobs)
- [ ] Optional: Business Profile / org settings ready so template apply is meaningful
- [ ] Staff can open `/command/docs/services-beta-launch` (this doc in Command docs library)

---

## What’s IN beta

| Area | What’s included |
|------|-----------------|
| Overview | Counts, pipeline, up-next, honesty note, template apply |
| Templates | Apply electrician / plumber / cleaner / … → workflow, fields, terminology |
| Jobs | Create / list / filter / detail edit |
| Schedule | Start/end on job; auto-stage toward `scheduled` when start set |
| Assignees | Pick from org memberships |
| Stages | Update stage on job detail |
| Notes | Activity notes on job detail |
| Day board | Scheduling view (next ~14 days) |
| Soft Commerce | Quote links on job detail → Commerce |
| Redirects | `/apps/services/quotes` → Commerce; `customers` → CRM; `teams` → Settings |

**Beta core path:** Template → Job → Schedule → Stage → Notes → Board.

---

## What’s OUT of beta (do not promise)

- **Drag-and-drop calendar** — day board is list/column style; no DnD reschedule
- **GPS / live field tracking** — not shipped
- **AI dispatcher** — template AI tools may be declared; no autonomous dispatch
- **Full calendar / recurrence / checklists product** — next after closed beta
- **Invoice auto-create from job** — soft quote links only
- **Separate Apps per trade** — never; industry stays configuration

Honesty string in product already covers dispatcher / GPS / DnD calendar.

---

## Smoke path (10–15 min)

Run on a **sandbox or founding-agency dogfood org** (not a random live client without consent).

1. **Overview** — `/apps/services` → confirm counts + honesty note load.
2. **Template** — Overview → apply a Service Template (e.g. electrician or cleaner) → confirm label / terminology update.
3. **Job** — `/apps/services/jobs` → create a job with title + site address (+ template fields if shown).
4. **Schedule** — Open job → set scheduled start/end → save → confirm stage moves toward scheduled when wired.
5. **Assign** — Pick an assignee from org members → save.
6. **Stage** — Advance stage via stage control → confirm list/pipeline reflect it.
7. **Notes** — Add a job note → confirm it appears on the activity timeline.
8. **Board** — `/apps/services/scheduling` → confirm the job appears on the day board for the scheduled day.
9. **Redirects** (quick):
   - `/apps/services/quotes` → `/apps/commerce/quotes`
   - `/apps/services/customers` → `/apps/crm/contacts`
   - `/apps/services/teams` → `/dashboard/settings/team`

---

## Redirects check

| Route | Expected |
|-------|----------|
| `/apps/services/quotes` | Redirect → `/apps/commerce/quotes` |
| `/apps/services/customers` | Redirect → `/apps/crm/contacts` |
| `/apps/services/teams` | Redirect → `/dashboard/settings/team` |

Owned nav only: Overview · Jobs · Scheduling. Do not add duplicate Quotes / Customers / Teams under Services.

---

## Founding-agency dry-run notes (for Ben)

No live-DB dry-run is required in this checklist pass — **document and run manually** when ready.

### Suggested dry-run

1. Pick one founding agency org (or create a sandbox org named for the pilot).
2. Install / enable **Services** if missing.
3. Invite or confirm at least two memberships (owner + tech) for assignee coverage.
4. Run the **Smoke path** above end-to-end once.
5. Capture screenshots or a short Loom of: template applied → scheduled job on day board → note + stage change.
6. Brief the agency: IN list only; explicitly call out OUT (DnD calendar, GPS, AI dispatcher).
7. Cleanup: archive/complete the sandbox job or leave labelled `DG beta dry-run` for follow-up.

### Talking points

- One Services App; their trade is a **template**, not a custom build.
- Quotes and invoices stay in **Commerce**; customers in **CRM**.
- Closed beta is job ops + scheduling board — calendar polish comes next.

---

## Pilot checklist (Day-0)

- [ ] Prerequisites met (`DATABASE_URL`, Services installed, Team members)
- [ ] Smoke path green (template → job → schedule → stage → notes → board)
- [ ] Redirects check green
- [ ] Agency briefed on OUT list
- [ ] Support knows honesty note wording matches promises

---

## Routes (quick map)

| Route | Beta role |
|-------|-----------|
| `/apps/services` | Overview + template apply |
| `/apps/services/jobs` | Job list / create |
| `/apps/services/jobs/[id]` | Edit, schedule, assign, stage, notes, quote links |
| `/apps/services/scheduling` | Day board |
| `/apps/services/quotes` | Redirect → Commerce |
| `/apps/services/customers` | Redirect → CRM |
| `/apps/services/teams` | Redirect → Settings Team |
| `/command/docs/services-app` | Architecture |
| `/command/docs/services-beta-launch` | This checklist (staff) |

---

## Related

- [SERVICES-APP.md](./SERVICES-APP.md) — architecture & non-goals  
- In-app honesty: Services Overview (`honestyNote` from platform-core Services overview)
