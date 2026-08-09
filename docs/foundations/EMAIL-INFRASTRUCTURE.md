# DigitalGate Email Infrastructure

**Core Platform Service — orchestrate email; do not run a mail server**

**Version:** 0.1  
**Last updated:** August 2026  
**Status:** Architecture locked · E1 shipped (Resend domain prepare / auth DNS apply / verify) · Mailbox later  
**Audience:** Founder + developers building Core / Infrastructure

**Related:** [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) · [PRODUCT-VISION.md](../PRODUCT-VISION.md) · [PLATFORM-ARCHITECTURE.md](../PLATFORM-ARCHITECTURE.md) · [COMMUNICATIONS](../../packages/platform-core/src/communications/index.ts) · Digital Identity (`Profile → Domain → Website → … → Email → …`)

---

## Why this exists

Email is **not** an SMTP setting buried in App config. It is part of **Digital Identity** and **Infrastructure** — the control layer that makes domains, DNS, SSL, hosting, and email manageable from one place (“Gateway to Your Digital World”).

DigitalGate **orchestrates** established providers. We do **not** build or operate our own MTA / mailboxes / spam stack.

---

## Architecture placement

```
DigitalGate Platform
├── Core
├── Email Service          ← this document (Infrastructure layer)
├── Domain / DNS Service
├── Hosting Service
├── SSL Service
├── Website Builder
├── CRM / Automation / AI
└── Industry Apps
```

Email Service sits under **Infrastructure** (Core Platform Service), sibling to Domains/DNS/Hosting/SSL — not under CRM Marketing as the SoT for identity or deliverability.

```
Infrastructure
└── Provider Adapters
      ├── Dreamscape (V1)     — domains, DNS, hosting, business mailboxes
      ├── Resend (V1)         — transactional (+ marketing send later)
      ├── Vercel              — SSL / custom host (websites)
      └── Google / Microsoft  — business mailbox later (optional)
```

**Customer UX never names providers** — DigitalGate Email / Domains / DNS / SSL.

---

## Two planes (do not conflate)

| Plane | Who sends | Provider (V1) | Purpose |
|-------|-----------|---------------|---------|
| **Platform email** | DigitalGate the company | Resend (`RESEND_*`) | Staff/system: ops alerts, Command Centre, Refer & Earn invites, platform onboarding |
| **Tenant email** | Customer organisation | Resend (tenant from/domain) + Dreamscape mailbox | Brand-from addresses, CRM follow-ups, invoices, Acc confirmations, marketing |

Platform and tenant sending should remain **separable** (keys, from-domains, bounce streams) so one noisy tenant cannot burn DigitalGate’s platform reputation.

Tenant CRM “send a message” today routes through `communications` → Resend when configured — that is the **send path**. Email Infrastructure owns **identity, DNS auth, mailboxes, and deliverability status**.

---

## Capability map

### 1. Transactional

Welcome, password/reset (Clerk owns auth email today), in-app notifications, booking confirmations, invoice/payment receipts, system alerts, form → CRM acknowledgements.

**V1 send:** Resend API via Communications module.  
**Infra role:** From-domain verification, SPF/DKIM/DMARC status, bounce/complaint hooks (later).

### 2. CRM & Marketing

Lead follow-up, sequences, campaigns, appointment reminders, review requests, re-engagement.

**V1:** Compose + queue via CRM/Automation; send via same transactional provider with marketing headers / unsubscribe (later).  
**Do not** invent a second ESP before deliverability + unsubscribe are designed.

### 3. Business email (mailboxes)

Domain mailbox provisioning, aliases/forwarders, seat management.

**V1 provider:** Dreamscape email hosting products (reseller API).  
**Later:** Google Workspace / Microsoft 365 connectors.  
**UX:** DigitalGate Email — never Dreamscape brand.

### 4. Email identity

Connect a customer domain so the org can send as `hello@theirbrand.com.au`.

Depends on: Domains inventory + DNS write (SPF/DKIM/DMARC records) + provider domain verify (Resend domain API / Dreamscape DNS).

### 5. Deliverability

| Concern | Infra responsibility |
|---------|----------------------|
| SPF / DKIM / DMARC | Propose + apply DNS via Domains DNS; track verification state |
| Domain reputation / status | Surface provider + DNS health on Email console |
| Bounces / complaints | Webhooks → Activities + suppress lists (later) |
| Unsubscribe | Required for marketing; link + preference store (later) |

---

## Provider split (locked for V1)

| Concern | Provider | Notes |
|---------|----------|-------|
| Domain register / DNS | Dreamscape | Already in Domains beta |
| Business mailbox | Dreamscape | Design now; provision stub |
| Transactional / marketing send | Resend | Already used for invites / communications |
| SSL for web | Vercel (auto) | Invisible on default path |
| Platform DigialGate send | Resend (platform keys) | Separate from tenant where possible |

**Rule:** Prefer orchestration APIs over SMTP password sprawl. SMTP is an escape hatch, not the product.

---

## Object model (design)

| Object | Purpose |
|--------|---------|
| `EmailDomain` | Org-owned sending/receiving domain; links `InfrastructureDomain` |
| `EmailIdentity` | Verified from-address / domain auth state (SPF/DKIM/DMARC) |
| `EmailMailbox` | Business mailbox seat (Dreamscape product) |
| `EmailSend` | Outbound attempt (already mirrored as Activity `OutboundEmail`) |
| `EmailSuppression` | Bounce/complaint/unsubscribe (later) |

Persist Neon when mailbox / domain-auth ships; until then Communications Activities + org settings hold send history.

---

## Provider interfaces (code)

```
packages/platform-core/src/infrastructure/email/
  types.ts           — EmailDomain, EmailIdentity, deliverability
  transactional.ts   — TransactionalEmailProvider (Resend adapter)
  mailbox.ts         — BusinessMailboxProvider (Dreamscape stub)
  deliverability.ts  — SPF/DKIM/DMARC checklist + DNS record suggestions
  index.ts           — resolve providers + getEmailInfrastructureOverview
```

```typescript
interface TransactionalEmailProvider {
  id: string;
  send(input: TransactionalSendInput): Promise<TransactionalSendResult>;
  verifyDomain?(domain: string): Promise<EmailDomainVerification>;
}

interface BusinessMailboxProvider {
  id: string;
  listMailboxes(organisationId: string): Promise<EmailMailbox[]>;
  // provisionMailbox / aliases — later
}
```

Communications `sendMessage` remains the App-facing API; Email Infrastructure owns provider resolution and domain auth.

---

## Go-live checklist (Email column)

Extends Infrastructure / Website go-live:

```
Domain · DNS · Hosting · SSL · Website · Email
                                         ├── Domain connected
                                         ├── SPF present
                                         ├── DKIM present (provider)
                                         ├── DMARC present (policy)
                                         ├── Transactional from verified
                                         └── Mailbox (optional / later)
```

---

## IN / OUT for near-term pilots

### IN (design + thin surface)

- Architecture + package layout (this doc)
- Overview status: Resend configured? suggested auth DNS for a domain
- Email console: Prepare → Apply auth DNS → Check verification (Domains inventory required)
- Dreamscape SOAP DomainDNSUpdate supports TXT (SPF/DKIM/DMARC)
- Keep using Resend for platform/tenant transactional where keys exist

### OUT (do not promise yet)

- Full mailbox admin UX
- Building our own SMTP server
- Autonomous marketing ESP with campaigns UI
- Guaranteed inbox placement / “AI deliverability score” without data
- Mixing platform and tenant bounce streams

---

## Security & ops

- Provider API keys **server-side only** (`RESEND_API_KEY`, Dreamscape SOAP/REST)
- Never commit keys; regenerate if leaked
- Sandbox Dreamscape for mailbox experiments until tests pass
- Customer UX: DigitalGate Email — never Resend/Dreamscape in copy
- Platform from-address: `RESEND_FROM_EMAIL` (DigitalGate); tenant from: org verified domain later

---

## Implementation sequence

| Step | Work |
|------|------|
| **E0** | Docs + types + overview API/UI |
| **E1** | Resend domain verify + apply SPF/DKIM/DMARC via Domains DNS (**shipped**) |
| **E2** | Tenant from-domain on Communications send |
| **E3** | Dreamscape mailbox list/provision stub → real product SKU |
| **E4** | Bounce/complaint webhooks + suppressions |
| **E5** | Marketing unsubscribe + sequence send limits |

---

## Related code today

| Path | Role |
|------|------|
| `packages/platform-core/src/communications/` | App send API + Resend + branded HTML |
| `packages/platform-core/src/infrastructure/email/` | Email Infrastructure service (this layer) |
| `packages/platform-core/src/infrastructure/dns/` | DNS apply for auth records |
| `docs/foundations/INFRASTRUCTURE.md` | Domains / hosting / SSL umbrella |

---

## Decision log

| Decision | Choice |
|----------|--------|
| Mail server | **Do not build** — orchestrate providers |
| Transactional V1 | **Resend** |
| Mailbox V1 | **Dreamscape** (then Google/MS optional) |
| Layer | **Infrastructure Core Service**, not CRM-only |
| Branding | Customer UX = DigitalGate Email |
