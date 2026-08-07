# Commerce Specification

**Customer-facing commercial layer for DigitalGate Platform**

Commerce is a **Core Capability** — not accounting (Xero/MYOB) and not a payment processor. The platform owns business logic, checkout UX, and cross-app orchestration; trusted providers handle PCI, settlement, and compliance.

---

## Scope

| In scope | Out of scope |
|----------|--------------|
| Quotes, invoices, payment links, checkout | General ledger, BAS, payroll |
| Subscriptions & recurring billing | Bank reconciliation (accounting) |
| Refunds, tax lines on documents | Becoming merchant of record |
| Payment method orchestration | Holding customer funds |
| Commerce intelligence → Digital Twin™ | |

---

## Architecture

```
Any App (RE, Accommodation, Creator, …)
        │
        ▼
  Commerce API  ── createPaymentRequest / createQuote / createInvoice
        │
        ▼
  Payment Engine  ── state machine, idempotency, events
        │
        ▼
  Payment Connector Registry
        │
   ┌────┴────┬─────────┬─────────┐
   ▼         ▼         ▼         ▼
 Stripe   PayPal   Square   Crypto (future)
```

### Principles

1. **Apps never call Stripe directly** — they call Commerce.
2. **One payment request model** — deposit, booking, retainer, merch all use `CommercePaymentRequest`.
3. **Connectors are swappable per org** — Roe on Stripe, another tenant on Square.
4. **Events drive automation** — `commerce.payment.completed` → project, review request, referral.
5. **External IDs on metadata** — idempotent webhook handling.

---

## Universal objects

| Object | Purpose |
|--------|---------|
| `CommerceProduct` | Catalog: services, fees, packages |
| `CommerceQuote` | Pre-sale document; acceptance triggers invoice/payment |
| `CommerceInvoice` | AR document; tracks due date and aging |
| `CommercePaymentRequest` | Cross-app “please pay this” — links to quote/invoice or standalone |
| `CommercePayment` | Settled money movement |
| `CommerceSubscription` | Recurring billing |
| `CommerceRefund` | Partial/full refund against a payment |
| `PaymentConnectorInstallation` | Org-level provider config (encrypted credential ref) |

---

## Payment request flow

```typescript
// Real Estate — marketing contribution
await createPaymentRequest({
  organisationId,
  sourceApp: "real-estate",
  sourceEntity: { type: "Property", id: propertyId },
  contactId: vendorContactId,
  lineItems: [
    { description: "Marketing contribution", quantity: 1, unitAmountCents: 250000, taxCode: "GST" },
  ],
  allowedMethods: ["card", "bank_transfer"],
  dueAt: addDays(new Date(), 7),
});
```

Returns `{ paymentRequestId, checkoutUrl, paymentLinkUrl }`.

Customer pays via **DigitalGate Checkout** (hosted page). Same UI whether the request came from RE, Accommodation, or Creator.

---

## Payment Connector contract

Every provider implements `PaymentConnector`:

| Method | Description |
|--------|-------------|
| `createCheckoutSession` | Hosted checkout (card, wallets) |
| `createPaymentLink` | Shareable URL |
| `createSubscription` | Recurring (provider-managed) |
| `refundPayment` | Full/partial refund |
| `parseWebhook` | Verify signature → normalized event |
| `healthCheck` | Connector status for org |

Normalized webhook events:

- `checkout.completed`
- `payment.failed`
- `subscription.updated`
- `refund.created`

The Payment Engine maps these → platform events.

---

## Cross-app journey

```
Website → Lead → CRM → Quote → Accepted → Invoice → PaymentRequest
    → Payment → Automation → Project → Review → Referral
```

Each step emits domain events. Commerce owns Quote → Invoice → Payment.

---

## Digital Twin™ — Financial Health

Commerce feeds Twin metrics:

- `revenueMtdCents`, `outstandingArCents`, `overdueArCents`
- `mrrCents`, `subscriptionCount`, `churnRate`
- `avgPaymentDays`, `failedPaymentRate`, `refundRate`
- `topCustomersByRevenue`, `paymentMethodBreakdown`
- `cashFlowForecast` (AI layer on historical patterns)

---

## Phased delivery

| Phase | Deliverable |
|-------|-------------|
| **1** | Schema + Payment Engine + Stripe connector + payment links |
| **2** | Quotes, invoices, checkout pages |
| **2.5** | AU tax invoice / quote documents (Business Profile letterhead, GST 10%, print) + Commerce Reports (P&L, GST, BS scaffold, Cash Flow) |
| **3** | Subscriptions, recurring billing |
| **4** | Commerce dashboard + Twin financial health |
| **5** | PayPal, Square, digital assets (stablecoins first) |

**AU Country Pack:** Documents pull legal/trading name, ABN, address, phone, email, logo, and bank remittance from Business Profile. Default GST 10% (`taxRateBps: 1000`). Reports summarise invoices & payments only — not a general ledger.

---

## Code locations

| Path | Role |
|------|------|
| `packages/database/prisma/schema.prisma` | Commerce models |
| `packages/platform-core/src/commerce/` | Domain logic + Payment Engine |
| `packages/platform-core/src/commerce/connectors/` | Connector interface + registry |
| `packages/platform-core/src/commerce/connectors/stripe/` | Stripe adapter (Phase 1) |
| `docs/commerce/COMMERCE-SPECIFICATION.md` | This document |

---

## Security & compliance

- Platform **never stores raw card numbers**.
- Provider credentials stored as encrypted refs (`credentialRef`), not plaintext keys in DB.
- Webhook signatures verified per connector before state changes.
- PCI scope stays with Stripe/PayPal/Square.
