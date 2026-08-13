# Commerce closed beta — launch guide

**Audience:** Ben (DigitalGate) + pilot organisations taking payments on Gen 2  
**Status:** Code-complete for Commerce IN surface (Aug 2026) + Products catalogue + Subscriptions MRR read view  
**Depends on:** Gen 2 + Neon commerce tables; Stripe Connect / platform keys (`STRIPE_*`) for live charge paths

---

## Who it's for

AU pilots that need to:

- Connect Stripe and request payments
- Create quotes and invoices (optionally from catalogue products)
- Maintain a product catalogue for fast quoting
- See a Neon-backed financial snapshot (revenue / AR / overdue / customer MRR)
- Run basic financial reports from live commerce data

Not for: inventory/variants, customer self-serve cancel/pause UI, multi-PSP (PayPal/Square/crypto), or full accounting/GL.

---

## What's IN beta

| Area | What's included |
|------|-----------------|
| Overview | Financial snapshot via `getCommerceFinancialSnapshot` (MTD/YTD, AR, overdue, MRR) |
| Stripe setup | Connect / platform billing hooks from Commerce overview |
| Payments | Payment requests + payment history |
| Quotes | Create, list, accept path into invoices where wired; catalogue product picker |
| Invoices | Create, send, list, document view; catalogue product picker |
| Products | Catalogue CRUD (name, SKU, price, GST, activate/archive) |
| Subscriptions | Read-only customer subscription ledger + MRR rollup (PSP sync via upsert) |
| Reports | Profit & loss, GST, cash flow, balance sheet from Neon commerce data |

**Beta core path:** Stripe ready → Product (optional) → Quote → Invoice → Payment request → Paid → Overview/reports refresh.

---

## What's OUT of beta (do not promise)

- **Inventory / variants / public checkout catalogue**
- **Subscription create / cancel / pause UI** — ledger is read-only; write from PSP webhooks via `upsertCommerceSubscription`
- **PayPal / Square / crypto** checkout
- **Accounting / GL / bank reconciliation** — Twin extras and $0 forecast fields stay OUT
- **Multi-currency productisation** beyond AUD-first paths already in code
- **Platform SaaS billing** — DigitalGate org billing ≠ Commerce customer subscriptions

---

## Demo path (staff)

1. Switch into pilot org with Commerce enabled (starter+ tiers include Commerce).
2. `/apps/commerce` — confirm snapshot loads (zeros OK for empty org); MRR tile links to Subscriptions.
3. Stripe setup panel — connect or confirm platform keys for dogfood.
4. `/apps/commerce/products` — add a catalogue item → create a quote using “From catalogue”.
5. Convert/send invoice → create payment request → complete a test payment.
6. `/apps/commerce/reports` — confirm figures move with Neon data.
7. `/apps/commerce/subscriptions` — empty OK until PSP writes rows; honesty note visible.

---

## Day-0 checklist

- [ ] `STRIPE_*` (and Connect vars if used) set on Gen 2 deployment
- [ ] Pilot org has Commerce app enabled
- [ ] Overview financial snapshot renders without error
- [ ] Products create + quote catalogue picker smoke
- [ ] Quote → invoice → payment smoke on dogfood org
- [ ] Subscriptions page loads (empty state OK)

---

## Support playbook

| Symptom | Check |
|---------|--------|
| Snapshot empty / error | `DATABASE_URL`; commerce tables present; org id from session |
| Cannot charge | Stripe keys / Connect account status; payment request state |
| Products empty after create | Soft-deleted filter; `includeInactive`; API 422 validation |
| MRR always $0 | No `commerce_subscriptions` rows yet — expected until webhook upsert |

**Escalation:** org id, quote/invoice/payment ids, Stripe request id, Vercel deployment id.

---

## Related

- [commerce/COMMERCE-SPECIFICATION.md](./commerce/COMMERCE-SPECIFICATION.md)
- [INFRASTRUCTURE-BETA-LAUNCH.md](./INFRASTRUCTURE-BETA-LAUNCH.md)
- [COMMAND-CENTRE-BETA.md](./COMMAND-CENTRE-BETA.md)
- Manifest: `packages/platform-core/src/apps/builtins/commerce.ts`
