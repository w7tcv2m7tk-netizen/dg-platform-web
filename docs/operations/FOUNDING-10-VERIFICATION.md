# Founding 10 — Verification programme

**Purpose:** Prove the platform is secure, commercially honest, and simple enough for the first customer — before invites.

**Related:** [FOUNDING-10-RELEASE-GATE.md](./FOUNDING-10-RELEASE-GATE.md) · [GATE-1-DOGFOOD.md](../foundations/GATE-1-DOGFOOD.md) · [OPERATOR-EXPERIENCE.md](../foundations/OPERATOR-EXPERIENCE.md)

**Sequence:** SECURE → VERIFY → SIMPLIFY → ONBOARD → LEARN

---

## Phase 1 — Security verification (1–2 days)

### API permission matrix

Test each action as the persona listed. **Pass** = expected 403 or hidden UI; **Fail** = data leak or mutate succeeds.

| Action / route | Member | Admin | Owner | DG staff | API key |
|----------------|--------|-------|-------|----------|---------|
| `GET /api/v1/org/team` | view only | manage | manage | — | deny |
| `POST /api/v1/org/team/invite` | 403 | OK | OK | — | deny |
| `PATCH /api/v1/billing/checkout` | 403 | OK | OK | — | deny |
| `POST /api/v1/billing/portal` | 403 | OK | OK | — | deny |
| `GET /api/v1/contacts/export` | 403 | OK | OK | — | scoped |
| Connector mutate (WP, REA, Google, …) | 403 | OK | OK | — | deny |
| `PATCH /api/v1/org/apps` | 403 | OK | OK | — | deny |
| Industry API (PM, services, …) without beta | 403 | 403 | 403* | — | deny |
| `/api/v1/command/*` | 403 | 403 | 403 | OK | deny |
| Cross-org record by ID | 403/404 | 403/404 | own org | staff rules | deny |

\*Owner may still need beta flag for gated industry apps.

### Tenant isolation

- [ ] User A cannot read or mutate Organisation B records by ID (contacts, leads, opportunities, properties, …).
- [ ] Switching org in UI loads only that org’s data.
- [ ] Member cannot access another member’s private records where `own` scope applies (document gaps — progressive enforcement).

### Staff vs customer

- [ ] Customer org: `/command/*` blocked at layout (switch-to-DigitalGate message).
- [ ] Customer-facing pages: no links to `/command/*` (onboarding, CRM, prospecting).
- [ ] `/support/tickets` and `/support/escalations` redirect non-staff to `/support`.

### Record-scope honesty

- [ ] Document any route that still allows org-wide read for members when product expects `own` / `assigned` only.
- [ ] No high-risk mutate without `requirePermission` or `requireFeature`.

**Phase 1 sign-off:** _______________ Date: ___________

---

## Phase 2 — Commercial verification (1–2 days)

Run on **Roe Realty** or dedicated test org — not a live Founding customer until green.

### Checkout paths

| Scenario | Expected | Pass? |
|----------|----------|-------|
| Starter ($99) checkout | Subscription row + billing UI updates | |
| + Industry App ($99) | App appears in enabled set / nav when entitled | |
| + additional Template ($29) | Template visible under Industry | |
| + Growth App (e.g. SEO $99) | Growth section appears after purchase | |
| Founding discount (e.g. $227 → $158.90) | Stripe + UI match offer | |
| Customer portal | Opens from settings; plan/status honest | |
| Cancel / downgrade | Status updates; no dead end | |
| Webhook: `customer.subscription.updated` | Org billing flags update | |
| Webhook: `customer.subscription.deleted` | Entitlement suspended / honest messaging | |
| Member billing API | 403 on checkout and portal | |

### After payment — customer sees

- [ ] Enabled apps match what was sold (not full catalogue).
- [ ] Billing page reflects subscription (not placeholder).
- [ ] No staff-only surfaces exposed.

**Phase 2 sign-off:** _______________ Date: ___________

---

## Phase 3 — Six-persona walkthrough

No guided tours. Cold click-through; note friction and lies.

| Persona | Org / account | Golden path | Pass? |
|---------|---------------|-------------|-------|
| DigitalGate Owner | DigitalGate | Command Centre → Clients → Delivery | |
| DigitalGate Staff | DigitalGate | Sales / Founding 10 / Platform health | |
| Customer Owner | Roe or test | Signup → Priorities → profile → CRM → billing | |
| Customer Admin | Invited admin | Team invite → connectors → apps toggle | |
| Customer Member | Invited member | Assigned CRM work; blocked billing/settings | |
| Reseller | Partner account | Referral → attribution visible | |
| Delivery Partner | Delivery workspace | Project → milestones → Brain stage → QA | |

**Phase 3 sign-off:** _______________ Date: ___________

---

## Phase 4 — 30-second UX test

Give a **new** user login credentials. Do not explain the product.

**Ask:** *“What do you think DigitalGate wants you to do?”*

| Outcome | Verdict |
|---------|---------|
| Opens CRM → SEO → Analytics → Automation hunting | **Fail** — tighten Priorities / Founding Mode |
| Says “it’s telling me what needs attention” / lands on Priorities | **Pass** |

Founding Mode Day 1 sidebar (customer): **Business** (Priorities) · **CRM** · **Commerce** · **Design Studio** · **Intelligence** (Twin, Brain, Health, Advisor) · **Apps** (catalogue).

- [ ] Test completed with at least one external participant
- [ ] Notes captured

**Phase 4 sign-off:** _______________ Date: ___________

---

## Phase 5 — One vertical outcome (Real Estate proof)

Demonstrate one connected chain — not the full registry:

```
Website → AI Visibility → SEO → Lead → CRM → Automation → Appointment
→ Opportunity → Listing → Revenue
```

| Step | Live in Roe/test? | Pass? |
|------|-------------------|-------|
| Public site / capture | | |
| Lead in CRM | | |
| Opportunity created | | |
| Automation or task fired | | |
| Honest AI assist on record | | |

**Phase 5 sign-off:** _______________ Date: ___________

---

## Golden-path automation (recommended)

Add Playwright (or manual script) for these five before scale:

1. **Customer Owner** — signup → onboarding → profile → CRM opportunity → billing portal
2. **Customer Admin** — invite → team → permission boundary
3. **Customer Member** — assigned work; restricted billing/export
4. **Reseller** — referral → attribution
5. **Delivery** — accept customer → project → milestones → go-live checklist

---

## P1 — Entitlement resolver (during early onboarding)

Do **not** rebuild billing. Add one read model:

```
Org → Plan → Purchased Apps → Templates → Features → Permissions
```

Until then, document which source wins for: sidebar apps, API `requireFeature`, checkout, flags.

---

## Gate close

- [ ] Phases 1–5 signed off
- [ ] [FOUNDING-10-RELEASE-GATE.md](./FOUNDING-10-RELEASE-GATE.md) P0-5 / P0-6 ops ticks complete
- [ ] Only then send Founding 10 invites

**Do not** open Industry depth, Graph, or Marketplace until this gate is green.
