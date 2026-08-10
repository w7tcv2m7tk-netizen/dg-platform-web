# Accommodation property beta — launch guide

**Audience:** Ben (DigitalGate) + pilot property ops (starting with CVH)  
**Status:** Ready to offer as a closed beta (Aug 2026)  
**Depends on:** Gen 2 Acc ops (units, StayBooking, OTA iCal), DG Platform plugin **10.63.0+** on the property WordPress site

---

## Who it’s for

Australian short-stay / holiday properties (starting with Currumbin Valley Hideaway–style workflows) that want:

- Units, availability, bookings, guests, and housekeeping in DigitalGate (not wp-admin archaeology)
- Airbnb / Booking.com **iCal** import + DigitalGate export on Units
- WordPress site as the **public book-now** surface (Stripe guest checkout stays WP)

Not for: multi-property franchise SaaS, Network Reviews as a beta promise, or full WP-offline booking engine (P4).

---

## What’s IN beta

| Area | What’s included |
|------|-----------------|
| Org + apps | Create org with **Accommodation** template (auto-sets `acc.beta`) |
| Identity | Business Profile (ABN, logo, brand) |
| Connector | Per-org WordPress connector (API key + base URL) — CVH host/key only |
| Team | Clerk invites via Settings → Team |
| Units | Sync + edit; Neon `AccommodationUnit` soft SoT when synced (`acc.units_sot`) |
| Calendar / availability | Week, month, list; blocks; OTA sync |
| OTA iCal | Airbnb / Booking.com **import** URLs on unit; DigitalGate **export** URL → paste into OTAs |
| Channel roadmap | Stage 1 iCal → Stage 2 Booking.com Connectivity + Airbnb partner APIs — [ACC-CHANNEL-CONNECTIVITY.md](./foundations/ACC-CHANNEL-CONNECTIVITY.md) |
| Bookings | StayBooking read SoT; ops create + WP dual-write; Gen 2-first behind `acc.gen2_first_booking` |
| Guests | Contacts with Accommodation guest context (stays, LTV, VIP/repeat) |
| Housekeeping | Status board; Neon SoT when units synced |
| Check-ins / payments | As shipped on Gen 2 Acc surfaces (WP mirror where applicable) |
| Ops | Command Centre: `acc.beta` flag, **Enable Acc beta**, connector attention |

**Feature flag:** `acc.beta` — gates sidebar + `/apps/accommodation/*`.

---

## What’s OUT of beta (do not promise)

- **Public book-now / guest Stripe on Gen 2** — still **WordPress** for this beta
- **Multi-property franchise / portfolio hierarchy** — single org per property for now
- **Network Reviews** as a beta deliverable — Reviews nav may appear; treat as non-beta
- **Full WP-offline P4** — ops can run heavily on Neon; public capture + some mirrors still WP
- **Full marketing automation / AI Visibility** — may be installed by template; not Acc beta commitments
- **Mobile-native ops apps** — web + PWA shell only

---

## Staff: provision a pilot property

### Option A — Invite them to self-serve

1. Property owner signs into Gen 2 (`app.digitalgate.com.au`).
2. Org switcher → **Add business** → name + **Accommodation template**.
3. Lands with `acc.beta` on + Acc app installed.
4. They complete ABN/logo → WordPress connector → invite team → `/apps/accommodation`.

### Option B — Staff enable an existing org (CVH path)

1. Open **Command Centre → Clients**.
2. Find the org (e.g. CVH) → **Enable Acc beta** (or Flags → toggle **Accommodation beta**).
3. That sets `acc.beta`, installs `accommodation` (+ ensures CRM/Commerce enabled), sets industry `hospitality` if empty.
4. Switch into that org (org switcher) and walk the smoke test below.

### Option C — Flags only

- **Command Centre → Flags** → toggle `acc.beta` for the org.  
- If the app isn’t installed, prefer **Enable Acc beta** (Option B) so AppInstallation is created.

**CVH:** enable `acc.beta` before pilots if the gate would hide Accommodation for the existing tenant.

---

## Property setup steps (checklist)

1. **Create / select org** (Accommodation template or staff-provisioned).
2. **Business Profile** — ABN + logo (`/dashboard/business`).
3. **WordPress connector** — Settings → Connectors  
   - Plugin **10.63.0+** on the site  
   - Base URL: `https://{property}/wp-json/digitalgate/v1`  
   - Per-org Dev API key from WP → DG Platform → API Settings (CVH key only — never Roe/DG keys)  
4. **Invite team** — Settings → Team (Clerk invite).
5. Open **`/apps/accommodation`** — complete Getting Started checklist.
6. **Sync units** — Units → Sync from WordPress.
7. **OTA iCal** — On each unit: paste Airbnb/Booking.com **import** URLs; copy DigitalGate **export** URL into each OTA (never paste one OTA into another).
8. **Sync / create stays** — Bookings + Availability.

In-app checklist lives on `/apps/accommodation` (`AccBetaChecklist`).

---

## CVH path (quick)

| Step | Detail |
|------|--------|
| Plugin floor | **10.63.0+** (units meta + iCal fields; OTA sync APIs from 10.57+) |
| Connector | Org switcher → CVH business → Settings → Connectors → CVH base URL + `dgdev_` key |
| Enrol | Command Centre → Clients → **Enable Acc beta** |
| Ops home | `/apps/accommodation` checklist → Units → Availability → Bookings → Housekeeping |
| OTA | Import = OTA → DigitalGate; Export = DigitalGate → OTA |
| Public book-now | Remains on WordPress / Stripe guest keys — **out of beta** |

---

## Routes (quick map)

| Route | Purpose |
|-------|---------|
| `/dashboard/business` | Profile |
| `/dashboard/settings/connectors` | WordPress connector |
| `/dashboard/settings/team` | Invites |
| `/apps/accommodation` | Overview + beta checklist |
| `/apps/accommodation/units` | Units + OTA iCal |
| `/apps/accommodation/calendar` | Availability |
| `/apps/accommodation/bookings` | Stay bookings |
| `/apps/accommodation/guests` | Guest Contacts |
| `/apps/accommodation/housekeeping` | Turnover board |
| `/apps/accommodation/check-ins` | Today / tomorrow |
| `/apps/accommodation/payments` | Payment status on stays |
| `/command/clients` | Beta flag + provision |
| `/command/flags` | Cross-tenant flags |

---

## Smoke-test script (with a pilot property)

Run as the property owner (or staff switched into their org).

1. **Flag + app** — Confirm Accommodation appears in the sidebar (`acc.beta` on + app installed via **Enable Acc beta**, not Flags-only).
2. **Profile** — ABN + logo saved on Business Profile.
3. **Connector** — Connectors page → property Dev API key saved (URL-only preset does not count) → Test / status OK.
4. **Units** — Sync units; confirm at least one unit; open OTA fields.
5. **OTA** — Set one import URL (sandbox OK); confirm export URL present; sync calendars on Availability.
6. **Booking** — Sync stays or create ops booking; confirm Bookings list.
7. **Guest** — Open Guests; confirm Contact-linked guest after stay.
8. **Housekeeping** — Mark one unit dirty → clean.
9. **Check-ins** — Confirm today/tomorrow boards reflect stays.
10. **Empty states** — On a fresh sandbox org, confirm “Add your first…” copy (not “No bookings returned”).
11. **Command Centre** — Staff: org shows **Acc beta**; disconnect WP key temporarily → attention mentions connector.

---

## Support playbook

| Symptom | Check |
|---------|--------|
| No Accommodation in sidebar | Prefer **Enable Acc beta** (flag + AppInstallation). Flags-only can leave the app missing |
| “Accommodation beta” gate page | Same — enrol org via Clients → Enable Acc beta |
| Sync fails / summary error | Connector base URL + API key; plugin ≥ 10.63.0; property key only (never Roe/DG keys on another host) |
| No units | Sync from WordPress; Accommodation module enabled on WP |
| OTA gaps / double-book risk | Import vs export direction; never OTA↔OTA; run Availability sync |
| Bookings empty | Sync StayBookings / wait for WP dual-write webhook |
| Public book-now broken | Still WP — not a Gen 2 beta regression; check WP Stripe guest keys |

**Escalation:** Capture org slug, connector host, plugin version, unit/booking IDs, and timestamp. Prefer Gen 2 audit log + WP → DG Platform diagnostics.

---

## Known gaps (honest)

- Public book-now + guest Stripe remain on **WordPress** for this beta.
- Network Reviews / Marketing may appear installed — **not** Acc beta commitments.
- Full WP-offline booking engine is **P4** — Gen 2 ops are the beta surface.
- Soft SoT flags (`acc.units_sot`, `acc.housekeeping_sot`, `acc.gen2_first_booking`) remain available under Flags; beta enrolment does not force them on.

---

## Plugin / zip

- **No plugin bump required** for this Gen 2 beta readiness ship (flag, checklist, Command Centre, docs).
- Properties still need plugin **10.63.0+** for Acc unit/iCal APIs already shipped.
- Rebuild zip only if you change WP PHP for a pilot-blocking API.

---

## Related docs

- [ACC-BETA-PILOT-PACK.md](./ACC-BETA-PILOT-PACK.md) — outreach, Day-0 + Week-1 pilot checklist  
- [COMMAND-CENTRE.md](./COMMAND-CENTRE.md) — staff ops home  
- [DEPLOY-WP-PLUGIN.md](./DEPLOY-WP-PLUGIN.md) — plugin deploy  
- [WP-DETACH-BACKLOG.md](./WP-DETACH-BACKLOG.md) — P4 CVH booking SoT (out of this beta promise)  
- [foundations/CONTACTS-AND-APP-ROLES.md](./foundations/CONTACTS-AND-APP-ROLES.md) — Guest as Contact role  
