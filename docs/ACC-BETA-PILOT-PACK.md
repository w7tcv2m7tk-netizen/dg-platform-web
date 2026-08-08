# Accommodation property beta — pilot pack

**Audience:** Ben (outreach + Day-0 onboarding)  
**Use with:** [ACC-BETA-LAUNCH.md](./ACC-BETA-LAUNCH.md) (provisioning, smoke test, known gaps)  
**Geography focus:** Gold Coast / SEQ short-stay (CVH first)  
**Status:** Closed beta — Aug 2026

This pack is what you send and say. The launch guide is what you run on the product.

---

## Value prop (their language)

Lead with desk ops — not “AI platform.”

**One-liner:**  
Your units, calendars, OTA iCal, stays, guests, and housekeeping in one place — public book-now still runs on WordPress, then you work the stay in DigitalGate instead of hunting through wp-admin.

**Pain → outcome:**

| They feel today | Beta gives them |
|-----------------|-----------------|
| Units + OTA calendars managed in three tabs | Units with Airbnb/Booking.com import + DigitalGate export |
| “What’s arriving today?” is a WP scavenger hunt | Check-ins, bookings, housekeeping boards |
| Guest history scattered | Guests as Contacts with stay LTV / VIP / repeat |
| Principal can’t see connector health | Acc home + checklist; you see Acc beta + connector attention in Command Centre |

**Phrases that work:** units, availability, Airbnb/Booking.com iCal, stays, housekeeping, team invites.  
**Phrases to avoid in first contact:** Gen 2 book-now rebuild, franchise multi-property SaaS, Network Reviews, full WP-offline.

---

## What’s in / out (honest — say this early)

Copy-paste for email or call close:

> **In this beta:** units, availability/calendar, Airbnb & Booking.com iCal (import + DigitalGate export), stay bookings (StayBooking), guests, housekeeping, check-ins/payments as they exist in Gen 2, team invites, and Business Profile. Public book-now and guest Stripe stay on WordPress; Platform is where ops run the stay.
>
> **Not in this beta (don’t expect these yet):** public book-now moved to Gen 2, multi-property franchise hierarchy, Network Reviews as a deliverable, or a fully WordPress-offline booking engine.

Full tables: [ACC-BETA-LAUNCH.md — What’s IN / OUT](./ACC-BETA-LAUNCH.md#whats-in-beta).

**Prerequisite they must hear:** WordPress site with **DG Platform plugin 10.63.0+** and a per-org connector (API key + base URL). No plugin bump needed from us for this Gen 2 readiness ship — they still need that version for the Acc APIs already shipped.

---

## Outreach scripts (CVH / SEQ)

### Email (short)

**Subject options:**  
- Stay ops without living in wp-admin  
- Closed beta: units → calendar → housekeeping in one place  
- Quick ask — 30 min on your stay desk (Gold Coast)

```
Hi {Name},

I’m Ben from DigitalGate. We’re running a small closed beta for short-stay ops on Platform — units, availability, Airbnb/Booking.com iCal, stays, guests, and housekeeping — while public book-now stays on your WordPress site.

Not promising a Gen 2 book-now rebuild or multi-property franchise tooling in this phase. Focus is the desk: units → calendar → stay → turnover, with team access and a live connector (plugin 10.63+).

Would a 30-minute look at how you run arrivals and housekeeping this week work?

{signature}
```

### Call / voicemail (≈45 sec)

```
Hi {Name}, Ben from DigitalGate. Quick one — we’re piloting Accommodation ops for Gold Coast properties: units, OTA calendars, stays, and housekeeping in Platform, WordPress keeps public book-now. Looking for a property to run live stays with us for a few weeks. I’ll follow with a short email — or call me back on {number}.
```

### Objection handles (keep short)

| They say | You say |
|----------|---------|
| “Will guests book on the new site?” | “Not in beta. Public book-now stays WP/Stripe. Beta is ops: units, calendar, stays, housekeeping.” |
| “We have five properties.” | “Single org per property in this phase — still useful for one site; franchise portfolio is out.” |
| “What about reviews?” | “Reviews may appear in the app; Network Reviews isn’t a beta promise.” |
| “How much?” | “Closed beta — scoped pilot, not a full price conversation until Week-1 success.” |

---

## Day-0 onboarding checklist

### Before the call (Ben / staff)

- [ ] Confirm target org: new Accommodation template **or** existing org to enable (CVH)
- [ ] If existing: Command Centre → Clients → **Enable Acc beta** (or Flags → `acc.beta`) — prefer Enable so AppInstallation exists
- [ ] Note org slug; prepare smoke-test script from [ACC-BETA-LAUNCH.md](./ACC-BETA-LAUNCH.md#smoke-test-script-with-a-pilot-property)
- [ ] Confirm plugin **10.63.0+** before connector step
- [ ] Send calendar invite + this pack’s in/out blurb

### On the call — property + staff

- [ ] **Org** — Create/select org (Add business → Accommodation template, or staff-provisioned)
- [ ] **Business Profile** — ABN + logo (`/dashboard/business`)
- [ ] **WordPress connector** — Settings → Connectors  
  - Base URL: `https://{property}/wp-json/digitalgate/v1`  
  - Per-org Dev API key (CVH key only)  
  - Test connection OK
- [ ] **Team** — Settings → Team → Clerk invite for champion + 1 ops user
- [ ] Open **`/apps/accommodation`** — complete in-app Getting Started checklist (`AccBetaChecklist`)
- [ ] **Sync units** — confirm OTA import/export fields
- [ ] **Sync or create a stay** — Bookings / Availability
- [ ] Capture: plugin version, connector host, org slug, who owns Day-1 follow-up

### After the call (staff)

- [ ] Command Centre → Clients: org shows **Acc beta**; note any connector attention
- [ ] Drop Week-1 success criteria into a short email to the champion
- [ ] Book Week-1 check-in (30 min)

---

## Week-1 success criteria

Pilot is “working” when **all** of the following are true:

1. **Sidebar** — Accommodation visible (`acc.beta` on).
2. **Connector** — Test/status OK; Acc sync attempted without error.
3. **Units** — ≥1 unit synced; OTA fields understood (import vs export).
4. **Stay path** — ≥1 StayBooking visible; check-ins or bookings board used.
5. **Housekeeping** — ≥1 status change on a unit.
6. **Team** — ≥1 non-owner teammate accepted invite and opened `/apps/accommodation`.
7. **No false promises** — champion can restate what’s out (Gen 2 book-now, franchise, Network Reviews, full WP-offline).

**Stretch:** OTA calendar sync run; guest Contact with VIP/repeat badges; Gen 2-first create behind flag.

---

## Support / escalation (Command Centre)

| Symptom | Check |
|---------|--------|
| No Accommodation in sidebar / gate page | `acc.beta` — Clients → Enable Acc beta, or Flags |
| Sync fails / WP errors | Connector URL + API key; plugin ≥ 10.63.0; CVH key not Roe |
| No units / empty availability | Sync units; Accommodation module on WP |
| OTA confusion | Import = OTA→DG; Export = DG→OTA; never OTA↔OTA |
| Bookings empty | Sync stays / dual-write; not public book-now |

**Escalation packet:** org slug, connector host, plugin version, unit/booking IDs, timestamp.

---

## Closing the pilot week

1. Confirm Week-1 criteria with champion.  
2. Capture 2–3 quotes on desk time saved (optional).  
3. Before Day-0 next property, provision via launch guide Option A/B; confirm plugin **10.63.0+**.  
4. Monitor Command Centre for `acc.beta` + connector attention; escalate with the packet above — don’t expand scope into OUT-of-beta asks.
