# Global Readiness

**Australia first — architect for international from Platform 1.0**

Serving only Australia today does not mean hardcoding AU assumptions. Enable expansion by storing regional context on Organisation and respecting it in API/UI.

---

## Organisation regional settings

Every Organisation stores:

| Field | Example | Used by |
|-------|---------|---------|
| `locale` | `en-AU`, `en-NZ`, `en-US` | UI strings, date/number format |
| `timezone` | `Australia/Brisbane` | Tasks, bookings, reports, SLA |
| `currency` | `AUD`, `NZD`, `USD` | Invoices, opportunities, dashboards |
| `country` | `AU` | Address validation, tax |
| `taxProfile` | JSON | GST, VAT rules (Phase 2) |

**Platform 1.0:** Add `locale`, `timezone`, `currency` to Organisation — default `en-AU`, `Australia/Brisbane`, `AUD`.

---

## Currency

| Rule | Detail |
|------|--------|
| Storage | Amounts as **integer cents** + ISO 4217 `currency` field |
| Display | Format via `Intl.NumberFormat(org.locale, { currency })` |
| Conversion | Not automatic — report in org currency; FX table Phase 3+ |
| Stripe | Charge in org billing currency |

Never store floats for money.

---

## Time zones

| Rule | Detail |
|------|--------|
| Storage | UTC in database |
| Display | Convert to org timezone in UI and reports |
| Scheduling | Automations, SLA timers use org timezone |
| API | Accept ISO 8601 with offset; return UTC + org-local in metadata |

---

## Languages (i18n)

| Phase | Scope |
|-------|-------|
| **1.0** | English only; strings externalised (`messages/en-AU.json`) |
| **1.5** | Locale switcher; date/number formatting |
| **2.0** | Additional locales (en-NZ, en-US) |
| **3.0** | App manifest `locales[]` for third-party Apps |

**Rule:** No user-facing string literals in components — use i18n keys from day one.

---

## Tax systems

| Phase | Scope |
|-------|-------|
| **1.0** | `taxCents` on Invoice; GST note for AU |
| **1.5** | Stripe Tax integration |
| **2.0** | `taxProfile` per org — rate, inclusive/exclusive, registration number |

Tax logic in Platform Core billing — not per App.

---

## Regional compliance

| Region | Consideration |
|--------|---------------|
| AU | Privacy Act, APPs — see [DATA-GOVERNANCE.md](./DATA-GOVERNANCE.md) |
| NZ | Privacy Act 2020 — similar patterns |
| EU | GDPR — data residency, DPA (Phase 3+) |

`dataRegion` field on Organisation (future): `ap-southeast-2`, `eu-west-1` for Postgres replica selection.

---

## Address & phone

| Field | Approach |
|-------|----------|
| Address | Structured fields + `country`; validate per country library |
| Phone | E.164 storage; display with country code |
| Postcode | Country-specific validation |

Property object already uses structured address — reuse pattern everywhere.

---

## Related

- [CORE-OBJECT-SPECIFICATION.md](./CORE-OBJECT-SPECIFICATION.md) — Organisation fields  
- [WHITE-LABELLING.md](./WHITE-LABELLING.md) — regional branding  
