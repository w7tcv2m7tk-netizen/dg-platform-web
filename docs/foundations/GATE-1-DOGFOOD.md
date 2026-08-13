# Gate 1 — Internal Alpha dogfood

**In-app ticks:** Command Centre → [Gate 1](/command/gate-1) (`/command/gate-1`).  
**SSOT for gates / Founding 10:** [Commercially Ready v1](./COMMERCIALLY-READY-V1.md).

**Verdict:** MVPs are shipped. Gate 1 is **not closed** until this list is walked. Gate 2 (Founding 10 **active selling**) waits on P0/P1 only.

Audience / founder LinkedIn can run **now**. Do not full-scale paid acquisition. Do not claim a complete AI Business OS.

---

## Close rule

If a step dumps, lies, or needs Ben as glue → punch list it.

| Tier | Meaning | Before Founding outreach? |
|------|---------|---------------------------|
| **P0 Stop** | Blocks daily use / data loss / auth / pay / security | Must fix |
| **P1 Customer blocker** | Founding customer would stall without Ben | Must fix |
| **P2 Ugly** | Friction, copy, polish | Later OK |
| **P3 Later** | Nice-to-have | Park |

Do **not** block Founding 10 on live REA publish or Domain Production.

---

## 1. Dogfood — Roe Realty

Walk as a real estate founding customer:

- [ ] Signup → create / switch business — `/onboarding`
- [ ] Business Profile complete — `/dashboard/business`
- [ ] Setup guide / onboarding hub — `/onboarding`
- [ ] Connect something (WP / Google / Stripe) — `/dashboard/settings/connectors`
- [ ] Contact → opportunity → task — `/apps/crm`
- [ ] Automation fires (lead / opp / payment)
- [ ] AI assist on a real record (honest fallback OK)
- [ ] Command Centre usable for this org — `/command`
- [ ] Support / KB path (article + escalate) — `/support/help`
- [ ] Subscribe → billing portal (and cancel honesty)

---

## 2. Dogfood — Currumbin Valley Hideaway

Acc ops path. Do not claim Airbnb Partner API.

- [ ] Switch to CVH org
- [ ] Units + iCal import/export URLs — `/apps/accommodation`
- [ ] Create / delete a booking in Gen 2 — `/apps/accommodation/bookings`
- [ ] Calendar + OTA sync without looped blocks — `/apps/accommodation/calendar`
- [ ] Subscribe → portal on this org (if in scope)

Then, as capacity allows: DigitalGate, Aëtherra, Wantd — same Core journey, not new product areas.

---

## 3. Ops smoke (production)

- [ ] Stripe webhooks include `customer.subscription.updated` and `customer.subscription.deleted`
- [ ] Sentry DSN on production
- [ ] Resend sending from DigitalGate domain
- [ ] `DOMAIN_API_PATH_PREFIX=/sandbox` on Vercel (Production = enhancement, not a promise)
- [ ] WP plugin on Roe + CVH dogfood sites (capture / dual-write)

---

## 4. Close Gate 1

- [ ] Punch list written (P0–P3) from Roe + CVH passes
- [ ] Only P0 / P1 shipped — P2/P3 parked
- [ ] Founding offer IN/OUT card (no live REA publish / Domain Production as promise)
- [ ] Founding page live: `https://digitalgate.com.au/founding-customers/` (Oxygen paste)

**Then** open DigitalGate Founding 10 (indicative 3–5 RE + 2–5 other) as early access — not “beta testing.”
