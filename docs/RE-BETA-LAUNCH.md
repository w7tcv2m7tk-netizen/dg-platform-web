# Real Estate agency beta — launch guide

**Audience:** Ben (DigitalGate) + pilot agency owners/principals  
**Status:** Ready to offer as a closed beta (Aug 2026)  
**Depends on:** Gen 2 RE E2E (`f23082e`), DG Platform plugin **10.66.0+** on the agency WordPress site

---

## Who it’s for

Australian residential real estate agencies (starting with Roe Realty–style workflows) that want:

- Vendor & buyer pipelines in DigitalGate (not wp-admin)
- Appraisal → listing → offer → settlement on Platform
- WordPress site as the **public capture** surface (property reports, enquiries, bookings)

Not for: agencies that need portal syndication, full marketing automation, or Network Marketplace in this phase.

---

## What’s IN beta

| Area | What’s included |
|------|-----------------|
| Org + apps | Create org with **Real Estate** template (auto-sets `re.beta`) |
| Identity | Business Profile (ABN, logo, brand) |
| Connector | Per-org WordPress connector (API key + base URL) |
| Team | Clerk invites via Settings → Team |
| Vendor pipeline | Manual create + WP sync; stages through settlement |
| Buyer pipeline | Manual create + WP sync; contact tagged **Buyer** |
| Appraisals / properties | Start appraisal from vendor lead; property status |
| Listings | Listed / under offer / sold; publish to WP when connector live |
| Offers | Offers on property; accept → contract keys |
| Bookings | Appraisal bookings (Gen 2 create + WP inspection times) |
| Settlements | Settlement list from sold path |
| Commerce | Quotes / invoices / payment requests on leads (optional) |
| Contact roles | Vendor / Buyer are **tags on Contact**, not separate people objects |
| Ops | Command Centre: `re.beta` flag, Provision RE beta, connector attention |

**Feature flag:** `re.beta` — gates sidebar + `/apps/re/*`.

---

## What’s OUT of beta (do not promise)

- **Network Marketplace / Neon Acc SoT** — separate track
- **Portal syndication** (Domain, REA, etc.) — not built
- **Full marketing campaigns / automation** — Marketing app may appear installed; treat as non-beta
- **Public capture forms hosted only on Gen 2** — public property reports & enquiries still **WordPress**
- **Multi-agency franchise / office hierarchy** — single org per agency for now
- **Mobile-native agent apps** — web + PWA shell only
- **AI auto-execute listing copy at scale** — assist exists; not a guaranteed beta deliverable

---

## Staff: provision a pilot agency

### Option A — Invite them to self-serve

1. Agency owner signs into Gen 2 (`app.digitalgate.com.au`).
2. Org switcher → **Add business** → name + **Real Estate template**.
3. Lands on Business Profile with RE onboarding steps (`?reOnboarding=1`).
4. They complete ABN/logo → WordPress connector → invite team → `/apps/re`.

### Option B — Staff enable an existing org

1. Open **Command Centre → Clients**.
2. Find the org → **Enable RE beta** (or Flags → toggle **Real Estate beta**).
3. That sets `re.beta`, installs `real-estate` (+ ensures CRM/Commerce enabled), sets industry `real_estate` if empty.
4. Switch into that org (org switcher) and walk the smoke test below.

### Option C — Flags only

- **Command Centre → Flags** → toggle `re.beta` for the org.  
- If the app isn’t installed, prefer **Enable RE beta** (Option B) so AppInstallation is created.

**Roe Realty:** enable `re.beta` before pilots if the gate would hide RE for the existing tenant.

---

## Agency setup steps (checklist)

1. **Create / select org** (Real Estate template or staff-provisioned).
2. **Business Profile** — ABN + logo (`/dashboard/business`).
3. **WordPress connector** — Settings → Connectors  
   - Plugin **10.66.0+** on the site  
   - Base URL: `https://{agency}/wp-json/digitalgate/v1`  
   - Per-org Dev API key from WP → DG Platform → API Settings  
4. **Invite team** — Settings → Team (Clerk invite).
5. Open **`/apps/re`** — complete Getting Started checklist.
6. **Add first vendor lead** (or sync from WP).
7. **Start appraisal** → set listed → add offer → settle.

In-app checklist lives on `/apps/re` (`ReBetaChecklist`).

---

## Routes (quick map)

| Route | Purpose |
|-------|---------|
| `/dashboard/business` | Profile / RE onboarding banner |
| `/dashboard/settings/connectors` | WordPress connector |
| `/dashboard/settings/team` | Invites |
| `/apps/re` | Overview + beta checklist |
| `/apps/re/vendor-leads` | Vendor pipeline |
| `/apps/re/buyer-leads` | Buyer pipeline |
| `/apps/re/properties` | Appraisals & properties |
| `/apps/re/listings` | Active listings |
| `/apps/re/bookings` | Appraisal bookings |
| `/apps/re/settlements` | Settlements |
| `/dashboard/apps/real-estate/setup` | Longer setup guide |
| `/command/clients` | Beta flag + provision |
| `/command/flags` | Cross-tenant flags |

---

## Smoke-test script (with a pilot agency)

Run as the agency owner (or staff switched into their org).

1. **Flag** — Confirm Real Estate appears in the sidebar (`re.beta` on).
2. **Profile** — ABN + logo saved on Business Profile.
3. **Connector** — Connectors page → Test / status OK; note last sync.
4. **Vendor lead** — Add vendor lead with name + address; open detail; confirm Contact has **vendor** tag in CRM.
5. **Appraisal** — Start appraisal → property appears under Properties (status appraisal).
6. **Booking** (optional) — Create appraisal booking on Bookings; confirm it lists.
7. **Listing** — Move property to Listed; confirm Listings page; Publish to website if site connected.
8. **Offer** — Add offer on property; accept (contract keys set).
9. **Settlement** — Advance to sold / settlement; confirm Settlements list.
10. **Buyer** — Add or sync a buyer lead; confirm **buyer** tag on Contact.
11. **Empty states** — On a fresh sandbox org, confirm “Add your first…” copy (not blank dead ends).
12. **Command Centre** — Staff: org shows **RE beta**; disconnect/remove WP key temporarily → attention mentions connector.

---

## Support playbook

| Symptom | Check |
|---------|--------|
| No Real Estate in sidebar | `re.beta` off — provision or Flags |
| “Real Estate beta” gate page | Same — enrol org |
| Sync fails / WP summary error | Connector base URL + API key; plugin version ≥ 10.66.0; Test connection on vendor leads |
| Leads not importing | WP module Real Estate enabled; form submissions exist; Sync from WordPress |
| Contact missing Vendor/Buyer | Re-open lead create/sync path (roles set on create/sync) |
| Listing not on website | Publish to website / status Listed; WP properties endpoint |
| Invoice logo blank | Business Profile logo URL; Commerce letterhead |

**Escalation:** Capture org slug, connector host, plugin version, lead/property IDs, and timestamp. Prefer Gen 2 audit log + WP → DG Platform diagnostics.

---

## Known gaps (honest)

- Public capture remains on **WordPress** for this beta.
- Marketing / SEO / AI Visibility may be installed by template — **not** beta commitments.
- Appraisal bookings historically mixed WP-live vs Postgres; Gen 2 create path exists — verify per site.
- Command Centre Success Score ranking is live but still evolving; RE beta attention signals are the ops priority.

---

## Plugin / zip

- **No plugin bump required** for this Gen 2 beta readiness ship (flag, checklist, Command Centre, docs).
- Agencies still need plugin **10.66.0+** for the RE E2E WP APIs already shipped.
- Rebuild zip only if you change WP PHP for a pilot-blocking API.

---

## Related docs

- [COMMAND-CENTRE.md](./COMMAND-CENTRE.md) — staff ops home  
- [DEPLOY-WP-PLUGIN.md](./DEPLOY-WP-PLUGIN.md) — plugin deploy  
- [foundations/CONTACTS-AND-APP-ROLES.md](./foundations/CONTACTS-AND-APP-ROLES.md) — Vendor/Buyer as Contact roles  
- App setup UI: `/dashboard/apps/real-estate/setup`
