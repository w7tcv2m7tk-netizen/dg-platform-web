# Real Estate agency beta — pilot pack

**Audience:** Ben (outreach + Day-0 onboarding)  
**Use with:** [RE-BETA-LAUNCH.md](./RE-BETA-LAUNCH.md) (provisioning, smoke test, known gaps)  
**Geography focus:** Gold Coast / SEQ residential agencies  
**Status:** Closed beta — Aug 2026

This pack is what you send and say. The launch guide is what you run on the product.

---

## Value prop (their language)

Lead with pipeline and desk work — not “AI platform.”

**One-liner:**  
Your vendor and buyer pipeline, appraisals, listings, offers, and settlements in one place — website enquiries still land from WordPress, then you work them in DigitalGate instead of hunting through wp-admin and spreadsheets.

**Pain → outcome:**

| They feel today | Beta gives them |
|-----------------|-----------------|
| Vendor/buyer leads scattered (forms, inbox, Excel) | Vendor & buyer pipelines with stages through settlement |
| Appraisal booked → listing → offer tracked in three tools | Appraisal → listed → under offer → sold on Platform |
| “Is it on the website?” is a separate chore | Publish listed properties to WP when the connector is live |
| Principal can’t see what’s stuck | One RE home + checklists; you (DigitalGate) can see connector health in Command Centre |

**Phrases that work:** pipeline, appraisals, listings, offers, settlements, team invites, website sync.  
**Phrases to avoid in first contact:** AI platform, marketplace, syndication to Domain/REA, marketing automation, franchise hierarchy.

---

## What’s in / out (honest — say this early)

Copy-paste for email or call close:

> **In this beta:** vendor & buyer pipelines, appraisals/properties, listings (incl. publish to your WordPress site), offers, appraisal bookings, settlements, optional quotes/invoices, team invites, and Business Profile. Your public property reports and enquiry forms stay on WordPress; Platform is where the agency works the pipeline.
>
> **Not in this beta (don’t expect these yet):** Domain/REA portal syndication, full marketing campaigns, Network Marketplace, multi-office franchise hierarchy, or a native mobile agent app. Web + PWA only.

Full tables: [RE-BETA-LAUNCH.md — What’s IN / OUT](./RE-BETA-LAUNCH.md#whats-in-beta).

**Prerequisite they must hear:** WordPress site with **DG Platform plugin 10.66.0+** and a per-org connector (API key + base URL). No plugin bump needed from us for this Gen 2 readiness ship — they still need that version for the RE APIs already shipped.

---

## Outreach scripts (Gold Coast / SEQ)

### Email (short)

**Subject options:**  
- Vendor pipeline without living in wp-admin  
- Closed beta: appraisals → listings → settlement in one place  
- Quick ask — 30 min on your listing desk (Gold Coast / SEQ)

```
Hi {Name},

I’m Ben from DigitalGate. We’re running a small closed beta with Gold Coast / SEQ agencies for a Real Estate workspace on Platform — vendor and buyer pipelines, appraisals, listings, offers, and settlements — while your public site and enquiry forms stay on WordPress.

Not promising Domain/REA syndication or full marketing automation in this phase. Focus is the desk: lead → appraisal → listed → offer → settle, with team access and a live connector to your site (plugin 10.66+).

Would a 30-minute look at how you run appraisals and listings this week work? Happy to do 60 if you’d rather walk a live property.

{signature}
```

### LinkedIn (connection note or DM)

```
Hi {Name} — Ben from DigitalGate. Closed beta for SEQ agencies: vendor/buyer pipeline + appraisals/listings/offers in Platform, WP stays the public capture. Not syndication yet. Open to a 30-min desk walkthrough?
```

Follow-up if they accept:

```
Thanks {Name}. Ideal first call: how appraisals and listings move today, where leads get stuck, and whether your WP site can take the DG connector (10.66+). No deck — just your pipeline. Tue/Wed 10–11 or Thu after 2?
```

### Call / voicemail (≈45 sec)

```
Hi {Name}, Ben from DigitalGate. Quick one — we’re piloting a Real Estate workspace for Gold Coast agencies: vendor and buyer pipeline, appraisals through to settlement, still using your WordPress site for public enquiries. Not Domain syndication in this phase. Looking for one or two principals to run a live listing desk with us for a few weeks. I’ll follow with a short email — or call me back on {number}.
```

### Objection handles (keep short)

| They say | You say |
|----------|---------|
| “We already have a CRM.” | “Keep it if you want — beta is the RE desk path (vendor/buyer → appraisal → listing → offer) tied to your WP site, not a rip-and-replace pitch.” |
| “Will it auto-post to Domain?” | “Not in beta. Honest no. Website publish via your WP connector yes.” |
| “Is this AI?” | “Assist may show up later; this pilot is pipeline and listing ops. Success = you can run a file without wp-admin archaeology.” |
| “How much?” | “Closed beta — scoped pilot, not a full price conversation until we’ve run Week-1 success together.” |
| “We’re multi-office.” | “Single org per agency in this phase — still useful for one office or a principal’s desk; franchise hierarchy is out of beta.” |

---

## Discovery questions

Use on first call. Pick by timebox; don’t force all three.

### 30 minutes — fit + next step

1. How do vendor appraisals get booked and tracked today (who owns the stage)?
2. Where do website enquiries land, and who chases them in the first 24 hours?
3. What’s the painful handoff: appraisal → listing → under offer?
4. WordPress: who can install/update plugins and issue an API key this week?
5. Who would be Day-0 users (principal + how many agents/admin)?
6. Close: sandbox this week vs wait — and which live address you’d use for smoke test?

### 60 minutes — desk walkthrough

All of the 30-min set, plus:

7. Walk one recent vendor file end-to-end (tools used at each stage).
8. Buyer side: separate list, same CRM, or inbox-only?
9. Listing publish: who updates the website, and how often does that lag the board?
10. Offers/contracts: what’s recorded where today?
11. Team roles: who needs view-only vs full pipeline?
12. Any non-negotiables for a pilot (data residency concerns, branding, existing CRM export)?

### 90 minutes — pilot design

All of the 60-min set, plus:

13. Agree **Week-1 success** in their words (see criteria below) — write it down.
14. Pick provision path: self-serve Real Estate template vs you enable in Command Centre.
15. Confirm plugin version path to **10.66.0+** and who owns the connector test.
16. Name a pilot champion + backup; set Day-0 slot (60–90 min screenshare).
17. Escalation contact on their side (IT / WP contractor).
18. Explicit “out of beta” recap so expectations match [launch guide OUT list](./RE-BETA-LAUNCH.md#whats-out-of-beta-do-not-promise).

---

## Day-0 onboarding checklist

Run in order. Staff column = DigitalGate; Agency = principal/champion + WP access.

### Before the call (Ben / staff)

- [ ] Confirm target org: new Real Estate template **or** existing org to enable
- [ ] If existing (e.g. Roe-style): Command Centre → Clients → **Enable RE beta** (or Flags → `re.beta`) — prefer Enable so AppInstallation exists
- [ ] Note org slug; prepare smoke-test script from [RE-BETA-LAUNCH.md](./RE-BETA-LAUNCH.md#smoke-test-script-with-a-pilot-agency)
- [ ] Confirm they have (or will get) plugin **10.66.0+** before connector step
- [ ] Send calendar invite + this pack’s in/out blurb so expectations are set

### On the call — agency + staff

- [ ] **Org** — Create/select org (Add business → Real Estate template, or staff-provisioned)
- [ ] **Business Profile** — ABN + logo saved (`/dashboard/business`)
- [ ] **WordPress connector** — Settings → Connectors  
  - Base URL: `https://{agency}/wp-json/digitalgate/v1`  
  - Per-org Dev API key from WP → DG Platform → API Settings  
  - Test connection OK
- [ ] **Team** — Settings → Team → Clerk invite for champion + 1–2 agents/admin
- [ ] Open **`/apps/re`** — complete in-app Getting Started checklist (`ReBetaChecklist`)
- [ ] **First vendor lead** — manual create or Sync from WordPress
- [ ] **Start appraisal** → property visible under Properties
- [ ] (If time) Move toward Listed / note publish-to-website for when connector is live
- [ ] Confirm Contact shows **Vendor** / **Buyer** tags in CRM after create/sync
- [ ] Capture: plugin version, connector host, org slug, who owns Day-1 follow-up

### After the call (staff)

- [ ] Command Centre → Clients: org shows **RE beta**; note any connector attention
- [ ] Drop Week-1 success criteria into a short email to the champion
- [ ] Book Week-1 check-in (30 min)

Full agency setup + routes: [RE-BETA-LAUNCH.md — Agency setup](./RE-BETA-LAUNCH.md#agency-setup-steps-checklist).

---

## Week-1 success criteria

Pilot is “working” when **all** of the following are true (adapt wording with the agency on the 90-min call):

1. **Sidebar** — Real Estate visible for invited users (`re.beta` on).
2. **Connector** — Test/status OK; at least one sync or WP-backed action attempted without error.
3. **Vendor path** — ≥1 real (or agreed sandbox) vendor lead with stage movement; Contact tagged **Vendor**.
4. **Appraisal → property** — ≥1 appraisal started; property appears under Properties.
5. **Listing intent** — property moved to Listed **or** explicit plan/date to list + publish to WP.
6. **Team** — ≥1 non-owner teammate accepted invite and opened `/apps/re`.
7. **No false promises** — champion can restate what’s out (syndication, full marketing, marketplace).

**Stretch (nice, not required for Week-1 pass):** offer recorded, appraisal booking created, buyer lead with **Buyer** tag, settlement path touched on a sold sandbox file.

If Week-1 fails: usually connector/plugin version, missing invites, or expectations drift into OUT-of-beta — use Support below, don’t rebuild scope.

---

## Support / escalation (Command Centre)

### Agency-facing (what you tell them)

- First line: Ben / DigitalGate pilot contact (same thread as Day-0).
- They should send: what they clicked, org name, approximate time, screenshot, property/lead address or ID if visible.
- Do **not** send them Command Centre links.

### Staff playbook (symptoms)

| Symptom | Check |
|---------|--------|
| No Real Estate in sidebar / gate page | `re.beta` — Command Centre → Clients → Enable RE beta, or Flags |
| Sync fails / WP errors | Connector base URL + API key; plugin ≥ 10.66.0; Test on vendor leads |
| Leads not importing | WP Real Estate module on; submissions exist; Sync from WordPress |
| Contact missing Vendor/Buyer | Re-run create/sync path (roles set on create/sync) |
| Listing not on website | Status Listed + Publish to website; WP properties endpoint |
| Invoice logo blank | Business Profile logo; Commerce letterhead |

### Escalation packet (before deeper debug)

Capture and keep with the org in Command Centre notes:

- Org slug  
- Connector host / base URL  
- Plugin version  
- Lead / property IDs  
- Timestamp (AEST)  
- Gen 2 audit log + WP → DG Platform diagnostics if available  

**Ops home:** Command Centre Clients (RE beta flag, provision, connector attention). Detail: [COMMAND-CENTRE.md](./COMMAND-CENTRE.md) and [RE-BETA-LAUNCH.md — Support](./RE-BETA-LAUNCH.md#support-playbook).

---

## How Ben uses this tomorrow (cheat sheet)

1. Pick 5–10 Gold Coast / SEQ principals → send **Email** or **LinkedIn**; book 30 min.  
2. On the call, use **30-min discovery**; if they lean in, extend or rebook 60/90.  
3. Before Day-0, provision via launch guide Option A/B; confirm plugin **10.66.0+**.  
4. Run **Day-0 checklist** live; end with written **Week-1 success** criteria.  
5. Monitor Command Centre for `re.beta` + connector attention; escalate with the packet above — don’t expand scope into OUT-of-beta asks.

---

## Related

- [RE-BETA-LAUNCH.md](./RE-BETA-LAUNCH.md) — provision, smoke test, IN/OUT, known gaps  
- [COMMAND-CENTRE.md](./COMMAND-CENTRE.md) — staff ops  
- [DEPLOY-WP-PLUGIN.md](./DEPLOY-WP-PLUGIN.md) — plugin deploy  
- [foundations/CONTACTS-AND-APP-ROLES.md](./foundations/CONTACTS-AND-APP-ROLES.md) — Vendor/Buyer as Contact tags  
- In-app: `/apps/re` checklist · `/dashboard/apps/real-estate/setup`
