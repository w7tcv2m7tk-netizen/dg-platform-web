# DigitalGate Infrastructure

**Core Platform Service — provider-agnostic orchestration (Dreamscape first)**

**Version:** 0.2  
**Last updated:** August 2026  
**Status:** Architecture locked · DomainProvider + DreamscapeDomainProvider scaffold  
**Website Builder:** MVP shipped (`c188170`) — separate track; Infrastructure enables “Make it live” later

**Related:** [WEBSITE-BUILDER.md](./WEBSITE-BUILDER.md) · [PRODUCT-VISION.md](../PRODUCT-VISION.md) · [ROADMAP.md](../ROADMAP.md) · [GLOBAL-READINESS.md](./GLOBAL-READINESS.md) · [PLATFORM-ARCHITECTURE.md](../PLATFORM-ARCHITECTURE.md) · [infrastructure/INFRASTRUCTURE-ARCHITECTURE.md](../infrastructure/INFRASTRUCTURE-ARCHITECTURE.md)

---

## Developer brief (lock this)

| Rule | Detail |
|------|--------|
| **What it is** | Provider-agnostic **Core Platform Service** for domains, DNS, hosting, SSL, email |
| **What it is not** | Not an industry App; not bolted onto Website Builder |
| **First provider** | **Dreamscape** — strong V1 foundation; **keep it; don’t swap providers** |
| **Customer UX** | DigitalGate Domains / Hosting / Email / DNS / SSL — **never** say “Dreamscape” |
| **Sandbox first** | Develop only against `https://reseller-api.sandbox.ds.network` until automated tests pass |
| **Credentials** | `DREAMSCAPE_API_KEY` **server-side only**; browser → DigitalGate API → Dreamscape |
| **Keys** | Never commit real keys. Docs/example hashes are **docs-only** — if a real key was pasted into chat/docs, **regenerate it** in Reseller Console |
| **401 on Vercel** | Check sandbox key origin, **IP whitelist** (Vercel egress is dynamic), then redeploy — Reseller ID is **not** for REST |

---

## Architecture expansion

```
Platform Core
├── Apps              (CRM, Websites, RE, …)
├── Shared Services   (AI, Scoring, Automation, Event Bus, …)
└── Infrastructure    ← Core Platform Service
      └── Provider Adapters
            └── Dreamscape (V1) → Cloudflare / Vercel / … (later)
```

DigitalGate owns UX and provisioning. Providers own raw infrastructure. We do **not** become a physical hosting company.

---

## Why Dreamscape is the V1 foundation

Reseller REST API covers (keep — do not change providers for V1):

| Area | Capability |
|------|------------|
| Domains | Search / register / renew / transfer |
| DNS | Records management |
| Hosting | Web hosting, email hosting, servers |
| Products | SSL, site builder, SEO products |
| Commerce | Customers, invoices, balance |
| Handbooks | TLDs + pricing |
| Safety | Full **sandbox** isolated from production |

**Synergy note:** Dreamscape *is* the existing reseller. Keep it.

---

## Customer-facing product (Unified provisioning UX)

```
Build website (Website Builder)
  → Have a domain?
        Yes → Connect domain
        No  → Search & register (DigitalGate Domains)
  → Health checklist
        Domain · DNS · Hosting · SSL · Website · Email
```

SSL stays **invisible** on the default path (auto). Email splits:

- **Transactional** → Resend (platform)
- **Business mailbox** → Dreamscape → Google / Microsoft later

---

## Digital Identity

```
Profile → Domain → Website → GBP → Social → Email → Reviews → AI
```

**Org ↔ Dreamscape Customer** mapping links Organisation / Business Profile to reseller customer id so twin/profile knows which domains, hosting, email, and SSL products are owned. Scaffold: `DreamscapeCustomerLink` in `infrastructure/core` (persist later).

---

## Package layout

```
packages/platform-core/src/infrastructure/
  core/                     types, checklist, org↔customer map
  domains/                  DomainProvider + resolve
  dns/                      DnsProvider stubs
  hosting/                  HostingProvider stubs
  ssl/                      SslProvider (auto stub)
  email/                    EmailProvider stubs
  providers/dreamscape/     auth + REST client + DreamscapeDomainProvider
```

### DomainProvider (provider-agnostic)

```typescript
interface DomainProvider {
  search(query: string | string[]): Promise<DomainAvailability[]>;
  register(params: RegisterDomainParams): Promise<Domain>;
  renew(domainId: string, params?: RenewDomainParams): Promise<Domain>;
  transfer(params: TransferDomainParams): Promise<Domain>;
  get(domainId: string): Promise<Domain | null>;
  update(domainId: string, params: UpdateDomainParams): Promise<Domain>;
  list(providerCustomerId?: string): Promise<Domain[]>;
}
```

**Implemented today:** `DreamscapeDomainProvider.search` → `GET /domains/availability`  
**Stubs:** register / renew / transfer / get / update / list

---

## Sandbox first (mandatory)

| Env | URL |
|-----|-----|
| **Sandbox (default)** | `https://reseller-api.sandbox.ds.network` |
| Production | `https://reseller-api.ds.network` — **only after automated tests** |

Sandbox Reseller Console: `https://reseller.sandbox.ds.network`  
(Login same as live; **API keys can differ** — copy from the console you are targeting.)

**Auth (every request, server-side):**

1. `Api-Request-Id` — unique MD5  
2. `Api-Signature` — MD5(`request_id + api_key`)

Official docs and the PHP SDK authenticator use **API key only** for REST. There is **no** `Reseller-Id` / `Account-Id` HTTP header. The console line “API Key together with your Reseller ID authorises you” is **account / WHMCS** identity on the API Setup page — **not** part of REST signing. Do **not** set `DREAMSCAPE_RESELLER_ID` in Vercel for DigitalGate’s REST client.

**Get sandbox API key:** [reseller.sandbox.ds.network](https://reseller.sandbox.ds.network) → **Account Settings → API & WHMCS → API Setup**

### 401 checklist (sandbox on Vercel)

| Step | Action |
|------|--------|
| **1. Key origin** | Copy the key from **sandbox** console (`reseller.sandbox.ds.network`), not live. Keys can differ; a prod key **401s** on sandbox. |
| **2. IP whitelist** | Same page → IP whitelist. Support may require the connecting server IP. **Vercel egress is dynamic by default** — there is no stable public IP range to paste. Prefer: **leave whitelist empty / disabled on sandbox** if Dreamscape allows; **or** enable [Vercel Static IPs](https://vercel.com/docs/networking/static-ips) (Pro/Enterprise) and whitelist those project IPs ([allowlist guide](https://vercel.com/kb/guide/how-to-allowlist-deployment-ip-address)); **or** call Dreamscape from a host/Worker with a fixed egress IP. |
| **3. Reseller ID** | **Not required for REST.** Ignore unless a WHMCS/plugin form explicitly asks for it (ours does not). |
| **4. Redeploy** | After changing Vercel env vars, **redeploy** so serverless picks them up. |

Other classic **401** causes (Dreamscape FAQ): wrong key, whitespace/quotes around the key, or sandbox/prod key mismatch.

```bash
# .env.local / Vercel — never commit real values
DREAMSCAPE_API_KEY=          # sandbox key when using sandbox base URL
DREAMSCAPE_API_BASE_URL=https://reseller-api.sandbox.ds.network
# Optional webhook (domain transfer Notification URL) — separate secret:
# DREAMSCAPE_WEBHOOK_SECRET=
# Do NOT set a Reseller ID env for REST — not used by Api-Request-Id / Api-Signature.
```

> **Security:** Example API keys in Dreamscape’s public docs are **not** DigitalGate credentials. If any real key was pasted into chat, tickets, or git history, **regenerate** it in Reseller Console immediately. Browser never holds the key — only `GET /api/v1/infrastructure/...` (and future routes) call Dreamscape.  
> Optional later: separate `DREAMSCAPE_API_KEY_SANDBOX` vs prod — today one `DREAMSCAPE_API_KEY` must match the configured base URL.

### Domain transfer Notification URL

Reseller Console asks for a **Notification URL** for domain transfer callbacks. DigitalGate endpoint:

| Env | URL |
|-----|-----|
| **Production** | `https://app.digitalgate.com.au/api/webhooks/dreamscape?secret=<DREAMSCAPE_WEBHOOK_SECRET>` |
| Local | `http://localhost:3000/api/webhooks/dreamscape?secret=<DREAMSCAPE_WEBHOOK_SECRET>` |

```bash
# Separate from the API key — generate a random string for Vercel / .env.local
DREAMSCAPE_WEBHOOK_SECRET=
```

- Dreamscape public API docs **do not** define an inbound webhook HMAC; we verify a shared secret (`?secret=` / `?token=` query, or `X-Dreamscape-Webhook-Secret` / Bearer).
- Paste the production URL (with secret query) into Reseller Console. Never put `DREAMSCAPE_API_KEY` in the URL.
- **Today:** `POST` acknowledges `200`, classifies transfer/status payloads, and persists an **in-memory event stub** (domain inventory update lands with Domains MVP).
- Route: `src/app/api/webhooks/dreamscape/route.ts` · helpers: `providers/dreamscape/webhooks.ts`

---

## Recommended stack

| Concern | Provider |
|---------|----------|
| Domains / renewals | **Dreamscape** (V1 — locked) |
| DNS | Dreamscape → Cloudflare later |
| Next.js hosting | Vercel / Cloudflare |
| SSL | Auto (invisible) |
| Business email | Dreamscape → Google / MS |
| Transactional email | Resend |
| Storage | R2 |
| CDN / WAF | Cloudflare |
| DB | Neon |
| Auth | Clerk |
| Payments | Stripe |

---

## Command Centre — Digital Infrastructure (vision)

| Surface | Intent |
|---------|--------|
| **Assets** | Domains, hosting, email, SSL owned by org (via Dreamscape customer link) |
| **Health score** | Domain / DNS / Hosting / SSL / Website / Email checklist |
| **AI renew** | Recommend renewals / expiry risk (design now) |

Scaffold: `getDigitalInfrastructureOverview(organisationId)` + checklist types. Full Command Centre UI later.

---

## Commercial packaging (sketch)

| Package | Includes |
|---------|----------|
| Presence | Domain connect + SSL + hosted site slot |
| Mailbox | Business email seats |
| Growth stack | Presence + CDN/WAF + Command Centre health |
| Agency | Multi-org + reseller margin via Dreamscape |

---

## Tracks (do not conflate)

| Track | Status |
|-------|--------|
| **Website Builder** | MVP shipped — Studio, structured sites, `/sites/[slug]` |
| **WP migrate** | Connector — separate |
| **Infrastructure** | Architect + Dreamscape search scaffold — Domains MVP next |

---

## Build sequence

| Step | Scope |
|------|-------|
| ✅ Now | Architecture · package layout · `DomainProvider` · Dreamscape search · sandbox default · API route · Domains UI stub |
| Next | Sandbox credentials · automated availability tests · register/renew stubs → real · Org↔Customer persistence |
| Domains MVP | Unified UX: connect / search-register → health checklist |
| Later | DNS write · mailbox · Vercel hooks · Command Centre assets + AI renew |

---

## Implementation map

| Artifact | Path |
|----------|------|
| Core types + org map | `packages/platform-core/src/infrastructure/core/` |
| DomainProvider | `…/domains/` |
| DreamscapeDomainProvider | `…/providers/dreamscape/` |
| Availability API | `src/app/api/v1/infrastructure/domains/availability/route.ts` |
| Transfer Notification webhook | `src/app/api/webhooks/dreamscape/route.ts` |
| Domains UX stub | `/apps/infrastructure/domains` |
| Overview helper | `getDigitalInfrastructureOverview` |
