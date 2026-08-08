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
| **Credentials** | `DREAMSCAPE_API_KEY` + `DREAMSCAPE_RESELLER_ID` **server-side only**; browser → DigitalGate API → Dreamscape |
| **Keys** | Never commit real keys. Docs/example hashes are **docs-only** — if a real key was pasted into chat/docs, **regenerate it** in Reseller Console |
| **401 on Vercel** | Set **Reseller ID** + sandbox key, redeploy. Sandbox has **no IP whitelist** (IP was a red herring). Production may still need static egress IP |

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
3. **Reseller ID header** — Dreamscape support (Aug 2026) requires Reseller ID **alongside** the API key. Public REST examples only show (1)+(2); the header name is not documented. DigitalGate defaults to **`X-Reseller-Id`** (support also mentioned `Reseller-Id`). Override with `DREAMSCAPE_RESELLER_ID_HEADER` if needed.

**Get sandbox credentials:** [reseller.sandbox.ds.network](https://reseller.sandbox.ds.network) → **Account Settings → API & WHMCS → API Setup** — copy **API Key** and **Reseller ID**.

### 401 checklist (sandbox on Vercel)

| Step | Action |
|------|--------|
| **1. Reseller ID** | **Required.** Set `DREAMSCAPE_RESELLER_ID` from API Setup (e.g. `25735`). Dreamscape support: must be passed with the API key. |
| **2. Key origin** | Copy the key from **sandbox** console (`reseller.sandbox.ds.network`), not live. Keys can differ; a prod key **401s** on sandbox. **If a key was pasted into chat/tickets: regenerate immediately** and update Vercel. If you already regenerated, do **not** put the old exposed value back — use the new key only. |
| **3. IP whitelist** | **Sandbox: no IP whitelist** (support confirmed — IP was a red herring for sandbox 401s). Production may still use IP allowlisting; for dynamic Vercel egress use [Static IPs](https://vercel.com/docs/networking/static-ips) or `DREAMSCAPE_HTTPS_PROXY` / `HTTPS_PROXY` (Fixie/QuotaGuard). |
| **4. Redeploy** | After changing Vercel env vars, **redeploy** so serverless picks them up. Set vars for **Production + Preview + Development**. Server-only (not `NEXT_PUBLIC_`). |

Other classic **401** causes (Dreamscape FAQ): wrong key, whitespace/quotes around the key, or sandbox/prod key mismatch. If auth still fails after Reseller ID, try `DREAMSCAPE_RESELLER_ID_HEADER=Reseller-Id` — logs print which header name was sent (never the API key). Availability API returns safe `env` flags (`hasKey`, `hasResellerId`, `hasBaseUrl`, `keyLength`) when not configured — never the key itself.

#### Local smoke

1. Set `DREAMSCAPE_API_KEY`, `DREAMSCAPE_RESELLER_ID`, and sandbox base URL in `.env.local`.
2. Run `npm run dev`, try Domains availability search.
3. Check server logs for `[dreamscape] request auth` — confirms which Reseller ID header name was sent.

#### Production on Vercel

1. Set `DREAMSCAPE_API_KEY`, `DREAMSCAPE_RESELLER_ID`, matching base URL (all three Vercel environments).
2. If live API enforces IP allowlisting: enable [Vercel Static IPs](https://vercel.com/docs/networking/static-ips) **or** set `DREAMSCAPE_HTTPS_PROXY` / `HTTPS_PROXY` and whitelist that egress IP.
3. Redeploy.

```bash
# .env.local / Vercel — never commit real values
DREAMSCAPE_API_KEY=          # sandbox key when using sandbox base URL
DREAMSCAPE_RESELLER_ID=25735 # from API Setup (required per Dreamscape support)
# Optional if support names a different header (default X-Reseller-Id):
# DREAMSCAPE_RESELLER_ID_HEADER=X-Reseller-Id
# # or: DREAMSCAPE_RESELLER_ID_HEADER=Reseller-Id
DREAMSCAPE_API_BASE_URL=https://reseller-api.sandbox.ds.network
# Optional: static-IP HTTPS proxy for Dreamscape (Fixie / QuotaGuard) — mainly production.
# Prefer DREAMSCAPE_HTTPS_PROXY; HTTPS_PROXY / https_proxy also work.
# DREAMSCAPE_HTTPS_PROXY=http://fix:password@fixie.example.com:80
# Optional webhook (domain transfer Notification URL) — separate secret:
# DREAMSCAPE_WEBHOOK_SECRET=
```

> **Security:** Example API keys in Dreamscape’s public docs are **not** DigitalGate credentials. If any real key was pasted into chat, tickets, or git history, **regenerate** it in Reseller Console immediately. Never paste keys into chat again. If you already regenerated, do **not** restore the old exposed value (`90e59881…`). Browser never holds the key — only `GET /api/v1/infrastructure/...` (and future routes) call Dreamscape (Node runtime).  
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
