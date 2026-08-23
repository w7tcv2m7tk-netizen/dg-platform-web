# Founding 10 — Verification programme

**Purpose:** Prove the platform is secure, commercially honest, and simple enough for the first customer — before invites.

**Related:** [FOUNDING-10-RELEASE-GATE.md](./FOUNDING-10-RELEASE-GATE.md) · [GATE-1-DOGFOOD.md](../foundations/GATE-1-DOGFOOD.md) · [OPERATOR-EXPERIENCE.md](../foundations/OPERATOR-EXPERIENCE.md)

**Locked priority order:**

1. Security verification  
2. Billing verification  
3. Customer 30-second UX  
4. Six-persona walkthrough  
5. One vertical outcome  
6. Founding 10 launch  
7. Entitlement read model (`resolveEntitlements(org)`) — **P1, not P0**  
8. Learn from real customers  

**Rule:** Any **FAIL** in sections 01–05 blocks Founding 10. When all five pass — **stop building** and bring in Founding 10.

---

## 01 — Security

Pass/fail matrix by **persona × domain**. Each cell: **PASS** / **FAIL** / **N/A**. Any **FAIL** blocks Founding 10.

| Persona | CRM | Billing | Team | Export | Command | Cross-org |
|---------|-----|---------|------|--------|---------|-----------|
| DG Owner | | | | | | |
| DG Staff | | | | | | |
| Customer Owner | | | | | | |
| Customer Admin | | | | | | |
| Customer Member | | | | | | |
| Delivery Partner | | | | | | |
| API Key | | | | | | |

### Domain definitions

| Domain | What to verify |
|--------|----------------|
| **CRM** | Read/write scoped to org; member cannot mutate admin-only records; industry beta gates enforced |
| **Billing** | Checkout, portal, subscription status — owner/admin only; members get 403 |
| **Team** | Invite, role change, remove — admin/owner only |
| **Export** | Contact/data export — admin/owner only; API key scoped or denied |
| **Command** | `/command/*` and `/api/v1/command/*` — staff only; customer org blocked at layout |
| **Cross-org** | User A cannot read or mutate Organisation B records by ID |

### Additional checks

- [ ] Customer UI: no links to `/command/*` (onboarding, CRM, prospecting)
- [ ] `/support/tickets` and `/support/escalations` redirect non-staff to `/support`
- [ ] Industry API without beta enrolment returns 403
- [ ] Document any route still allowing org-wide read when product expects `own` / `assigned`

**01 sign-off:** _______________ Date: ___________

---

## 02 — Commercial

Run one **actual** end-to-end chain on Roe Realty or a dedicated test org — not a live Founding customer until green.

```
Checkout → Stripe → Webhook → Entitlement → App appears → Template appears
    → Billing portal → Cancellation → Access removed
```

| Step | Expected | Pass? |
|------|----------|-------|
| Checkout (Starter / Industry / Growth as sold) | Stripe session completes | |
| Webhook: `checkout.session.completed` | Org billing row updates | |
| Entitlement | Enabled apps match purchase — not full catalogue | |
| App appears | Sidebar / Apps catalogue reflects entitlement | |
| Template appears | Industry template visible when Industry + template purchased | |
| Billing portal | Opens from settings; plan/status honest | |
| Cancel / downgrade | Status updates; no dead end | |
| Webhook: `customer.subscription.deleted` | Access removed or suspended with honest messaging | |
| Member billing API | 403 on checkout and portal | |

This proves the **commercial model**, not merely that Stripe works.

**02 sign-off:** _______________ Date: ___________

---

## 03 — Six-persona walkthrough

**Test jobs, not screens.** No guided tours. Cold click-through; note friction and lies.

| Persona | Job to prove | Pass? |
|---------|--------------|-------|
| **DG Owner** | Can I run DigitalGate? (Command Centre → Clients → Delivery) | |
| **DG Staff** | Can I manage customers? (Sales / Founding 10 / Platform health) | |
| **Customer Owner** | Can I understand my business? (Overview → priorities → CRM → billing) | |
| **Customer Admin** | Can I manage my team? (Invite → connectors → apps toggle) | |
| **Customer Member** | Can I perform my job without seeing things I shouldn't? | |
| **Reseller / Delivery** | Can I bring a customer in and get them operational? | |

**03 sign-off:** _______________ Date: ___________

---

## 04 — 30-second test

**The most important UX test.**

Give a new person a **fresh customer account**. Say nothing. Watch.

### PASS

They immediately understand:

> DigitalGate is telling me what matters in my business.

They land on **Overview** (Intelligence-led home): Business Health, today's priorities, Advisor, opportunities — not app-hunting.

### FAIL

They start asking:

- "What's CRM?"
- "What's AI Visibility?"
- "Do I need SEO?"
- "What's Digital Twin?"
- "Which App am I supposed to open?"

If they need an explanation before seeing value, the UX still needs work.

**Founding Mode Day 1 sidebar (customer):** Core only — **Overview** · **CRM** · **Commerce** · **Design Studio** · **Apps** (catalogue). Intelligence is **experienced on Overview**, not listed in the sidebar. Marketplace / Network hidden until Industry / Growth / Infra apps are added.

- [ ] Test completed with at least one external participant
- [ ] Notes captured

**04 sign-off:** _______________ Date: ___________

---

## 05 — Vertical outcome

For the first **Real Estate** customer, demonstrate the connected business body — not "27 Apps":

```
Business → Website → Visibility → Prospect → Discovery → CRM → Automation
    → Consultation → Appraisal → Listing → Buyer → Deal → Revenue
```

| Step | Live in Roe / test? | Pass? |
|------|---------------------|-------|
| Public site / capture | | |
| Lead in CRM | | |
| Opportunity created | | |
| Automation or task fired | | |
| Consultation / appraisal booked | | |
| Listing published | | |
| Revenue recorded | | |

**05 sign-off:** _______________ Date: ___________

---

## P1 — Entitlement read model (after Founding 10 launch)

Do **not** block Founding 10 on this. Add one read model when learning from customers:

```
Org → Plan → Purchased Apps → Templates → Features → Permissions
```

Until then, document which source wins for: sidebar apps, API `requireFeature`, checkout, flags.

---

## Gate close

- [ ] Sections 01–05 signed off (no FAIL cells)
- [ ] [FOUNDING-10-RELEASE-GATE.md](./FOUNDING-10-RELEASE-GATE.md) P0-5 / P0-6 ops ticks complete
- [ ] Only then send Founding 10 invites

**Do not** open Industry depth, Graph, or Marketplace until this gate is green.

**Then stop building** — the first ten customers will tell you what no amount of repository architecture can.
