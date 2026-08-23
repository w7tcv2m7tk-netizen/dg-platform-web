# Founding 10 — Release Gate ops checklist

**Code P0s (1–4)** ship in the product. **P0-5 / P0-6** are ops dogfood — tick here before invites.

See also: [FOUNDING-10-VERIFICATION.md](./FOUNDING-10-VERIFICATION.md) (sections 01–05 + persona matrix) · [GATE-1-DOGFOOD.md](../foundations/GATE-1-DOGFOOD.md)

---

## P0-5 — Email deliverability

Unreliable onboarding email = broken platform.

| Check | Pass? |
|-------|-------|
| Resend production API key on Vercel | |
| Sending domain `mail.digitalgate.com.au` verified in Resend | |
| SPF / DKIM / DMARC pass (mail-tester or Google Postmaster) | |
| Team invite email arrives (non-@digitalgate inbox) | |
| Founding / onboarding invite arrives | |
| Billing receipt / portal-related mail arrives (if enabled) | |
| Implementation / delivery invite arrives | |
| Soft bounce / failure visible in Resend logs | |

---

## P0-6 — Billing dogfood

Customer sees exactly what was promised. Use Roe or a dedicated test org — **not** production Founding pricing on a live customer until this passes.

| Check | Pass? |
|-------|-------|
| Checkout completes (test or live mode as intentional) | |
| Entitlement / plan status updates on org after webhook | |
| Customer Billing portal opens from settings | |
| Change plan / cancel path is honest (no dead end) | |
| Founding offer price ≠ standard catalog where expected | |
| Member without `billing.manage` cannot open checkout/portal API | |

---

## Gate close

- [ ] All six P0s passed (code + this checklist)
- [ ] Six-persona review (no guided tours): DG Staff · Customer Owner · Admin · Member · Reseller · Delivery
- [ ] Only then send Founding 10 invites

**Do not** open Industry depth / Graph / Marketplace until this gate is green.
