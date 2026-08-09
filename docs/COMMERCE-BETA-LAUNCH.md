# Commerce closed beta — launch guide

**Audience:** Ben (DigitalGate) + pilot organisations taking payments on Gen 2  
**Status:** Code-complete for Commerce IN surface (Aug 2026)  
**Depends on:** Gen 2 + Neon commerce tables; Stripe Connect / platform keys (`STRIPE_*`) for live charge paths

---

## Who it's for

AU pilots that need to:

- Connect Stripe and request payments
- Create quotes and invoices
- See a Neon-backed financial snapshot (revenue / AR / overdue)
- Run basic financial reports from live commerce data

Not for: product SKU admin, subscription MRR product UI, multi-PSP (PayPal/Square/crypto), or full accounting/GL.

---

## What's IN beta

| Area | What's included |
|------|-----------------|
| Overview | Financial snapshot via `getCommerceFinancialSnapshot` (MTD/YTD, AR, overdue) |
| Stripe setup | Connect / platform billing hooks from Commerce overview |
| Payments | Payment requests + payment history |
| Quotes | Create, list, accept path into invoices where wired |
| Invoices | Create, send, list, document view |
| Reports | Profit & loss, GST, cash flow, balance sheet from Neon commerce data |

**Beta core path:** Stripe ready → Quote → Invoice → Payment request → Paid → Overview/reports refresh.

---

## What's OUT of beta (do not promise)

- **Products / catalog SKU admin** — placeholder page may exist; **hidden from nav**
- **Subscriptions / MRR management UI** — placeholder page may exist; **hidden from nav** (platform org Stripe billing ≠ Commerce subscriptions product)
- **PayPal / Square / crypto** checkout
- **Accounting / GL / bank reconciliation** — Twin extras and $0 forecast fields stay OUT
- **Multi-currency productisation** beyond AUD-first paths already in code

---

## Demo path (staff)

1. Switch into pilot org with Commerce enabled (starter+ tiers include Commerce).
2. `/apps/commerce` — confirm snapshot loads (zeros OK for empty org).
3. Stripe setup panel — connect or confirm platform keys for dogfood.
4. Create a quote → convert/send invoice → create payment request → complete a test payment.
5. `/apps/commerce/reports` — confirm figures move with Neon data.
6. Confirm sidebar shows Overview / Invoices / Quotes / Reports / Payments only (no Products / Subscriptions).

---

## Day-0 checklist

- [ ] `STRIPE_*` (and Connect vars if used) set on Gen 2 deployment
- [ ] Pilot org has Commerce app enabled
- [ ] Overview financial snapshot renders without error
- [ ] Quote → invoice → payment smoke on dogfood org
- [ ] Products / Subscriptions not in Commerce sidebar
- [ ] Deep links `/apps/commerce/products` and `/subscriptions` still show placeholders (honest OUT)

---

## Support playbook

| Symptom | Check |
|---------|--------|
| Snapshot empty / error | `DATABASE_URL`; commerce tables present; org id from session |
| Cannot charge | Stripe keys / Connect account status; payment request state |
| Sidebar shows Products | Deploy includes commerce app `0.2.0+` (nav trimmed) |
| MRR expected on overview | OUT — use Command revenue for platform subscriptions, not Commerce product MRR |

**Escalation:** org id, quote/invoice/payment ids, Stripe request id, Vercel deployment id.

---

## Related

- [commerce/COMMERCE-SPECIFICATION.md](./commerce/COMMERCE-SPECIFICATION.md)
- [INFRASTRUCTURE-BETA-LAUNCH.md](./INFRASTRUCTURE-BETA-LAUNCH.md)
- [COMMAND-CENTRE-BETA.md](./COMMAND-CENTRE-BETA.md)
- Manifest: `packages/platform-core/src/apps/builtins/commerce.ts`
