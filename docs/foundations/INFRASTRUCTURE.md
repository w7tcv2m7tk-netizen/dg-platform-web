# DigitalGate Infrastructure

**Infrastructure App hierarchy layer — provider-agnostic orchestration (Dreamscape first)**

**Version:** 0.3  
**Last updated:** August 2026  
**Status:** **Domains + Email E1 closed beta packaged** — see [INFRASTRUCTURE-BETA-LAUNCH.md](../INFRASTRUCTURE-BETA-LAUNCH.md). Architecture locked · Search/connect/DNS/go-live + Resend auth DNS shipped. Hosting/Deploy/Monitoring Apps stay OUT.  
**Website Builder:** Closed beta + Make it live — [WEBSITES-BETA-LAUNCH.md](../WEBSITES-BETA-LAUNCH.md)

**Hierarchy:** [APP-HIERARCHY.md](./APP-HIERARCHY.md) — sits after **Core**, before **Industry**.  
**Related:** [WEBSITE-BUILDER.md](./WEBSITE-BUILDER.md) · [PRODUCT-VISION.md](../PRODUCT-VISION.md) · [ROADMAP.md](../ROADMAP.md) · [GLOBAL-READINESS.md](./GLOBAL-READINESS.md) · [PLATFORM-ARCHITECTURE.md](../PLATFORM-ARCHITECTURE.md) · [infrastructure/INFRASTRUCTURE-ARCHITECTURE.md](../infrastructure/INFRASTRUCTURE-ARCHITECTURE.md) · [CONNECTOR-PRIORITY.md](./CONNECTOR-PRIORITY.md) (Dreamscape #5 · Cloudflare #15)

---

## Developer brief (lock this)

| Rule | Detail |
|------|--------|
| **What it is** | Provider-agnostic **Infrastructure** layer for domains, DNS, hosting, SSL, email ([APP-HIERARCHY.md](./APP-HIERARCHY.md)) |
| **What it is not** | Not an industry App; not bolted onto Website Builder |
| **First provider** | **Dreamscape** — strong V1 foundation; **keep it; don’t swap providers** |
| **Customer UX** | DigitalGate Domains / Hosting / Email / DNS / SSL — **never** say “Dreamscape” |
| **Sandbox first** | Develop only against sandbox (SOAP soap-test or REST reseller-api.sandbox) until automated tests pass |
| **Credentials** | Server-side only. **SOAP** = Reseller ID + API Key (API Setup). **REST** = API Key + signature (no Reseller ID). Browser → DigitalGate API → Dreamscape |
| **Keys** | Never commit real keys. Docs/example hashes are **docs-only** — if a real key was pasted into chat/docs, **regenerate it** in Reseller Console |
| **401 on Vercel** | Support’s “Reseller ID + API Key” = **SOAP**. Set `DREAMSCAPE_RESELLER_ID` + `DREAMSCAPE_API_KEY` (auto SOAP). REST uses Api-Request-Id/Signature only — Redeploy after env changes |

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

SSL stays **invisible** on the default path (auto). Email is a full **Infrastructure service**:

- **Transactional / platform send** → Resend (Communications + Email Service)
- **Business mailbox** → Dreamscape → Google / Microsoft later  
- **Deliverability** → SPF / DKIM / DMARC via Domains DNS  

Canonical design: [EMAIL-INFRASTRUCTURE.md](./EMAIL-INFRASTRUCTURE.md).
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
  email/                    Email Service (Resend transactional + Dreamscape mailbox stub + deliverability)
  providers/dreamscape/     auth + REST/SOAP clients + DreamscapeDomainProvider
```

**Email Service:** [EMAIL-INFRASTRUCTURE.md](./EMAIL-INFRASTRUCTURE.md) — orchestrate providers; never run our own MTA. Overview: `/apps/infrastructure/email`.

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

**Implemented today:** `DreamscapeDomainProvider.search` + `register` / `renew` / `transfer` / `get`  
- **SOAP (preferred when Reseller ID set):** SecureAPI `DomainCheck`, `DomainCreate`, `ContactCreate`, `DomainDNSUpdate`, `DomainInfo`, `DomainRenew`, `TransferStart`  
- **REST (alternative):** `GET /domains/availability`, `POST /domains`, `POST /customers`  
**DNS:** `DreamscapeDnsProvider` via SOAP `DomainDNSUpdate` / `DomainInfo`

---

## Two Dreamscape APIs (do not mix auth)

Dreamscape exposes **two** integration surfaces. The Reseller Console page **Account Settings → API & WHMCS → API Setup** shows **Reseller ID + API Key** — that pair is the **SOAP / WHMCS** model. Public **REST** docs use a different auth scheme and **do not** take Reseller ID.

| | **SOAP (SecureAPI)** | **REST (doc-reseller-api)** |
|--|----------------------|------------------------------|
| **When** | Support / WHMCS / “Reseller ID + API Key” | Official REST docs + PHP SDK |
| **Auth** | SOAP header `Authenticate` → `ResellerID` + `APIKey` | Headers `Api-Request-Id` + `Api-Signature` = MD5(`request_id + api_key`) (+ `Accept`) |
| **Reseller ID** | **Required** | **Not used** (unless experimenting with `DREAMSCAPE_SEND_RESELLER_ID`) |
| **Domain check** | `DomainCheck` | `GET /domains/availability?domain_names[]=` |
| **Sandbox** | `https://soap-test.secureapi.com.au/API-1.3` | `https://reseller-api.sandbox.ds.network` |
| **Production** | `https://soap.secureapi.com.au/API-1.3` | `https://reseller-api.ds.network` |
| **WSDL / docs** | `https://soap.secureapi.com.au/wsdl/API-1.3.wsdl` | [doc-reseller-api.ds.network](https://doc-reseller-api.ds.network/) |

### Mode selection (`DREAMSCAPE_API_MODE`)

1. `DREAMSCAPE_API_MODE=soap` or `rest` → forced  
2. Else if `DREAMSCAPE_RESELLER_ID` is set → **SOAP** (matches API Setup credentials)  
3. Else → **REST**

---

## Sandbox first (mandatory)

### REST endpoints

| Env | URL |
|-----|-----|
| **Sandbox (default)** | `https://reseller-api.sandbox.ds.network` |
| Production | `https://reseller-api.ds.network` — **only after automated tests** |

Sandbox Reseller Console: `https://reseller.sandbox.ds.network`  
(Login same as live; **API keys can differ** — copy from the console you are targeting.)

### SOAP endpoints (SecureAPI)

| Env | Endpoint | WSDL | Console |
|-----|----------|------|---------|
| **Sandbox (default)** | `https://soap-test.secureapi.com.au/API-1.3` | `https://soap-test.secureapi.com.au/wsdl/API-1.3.wsdl` | `reseller.sandbox.ds.network` |
| Production | `https://soap.secureapi.com.au/API-1.3` | `https://soap.secureapi.com.au/wsdl/API-1.3.wsdl` | `reseller.ds.network` (live) |

> **SOAP path (critical):** always use `/API-1.3`. The WSDL also lists `…/server.php?v=1.3` on **both** soap and soap-test — that path returns HTTP 200 with an **empty body** (looks like auth failure / hung search). DigitalGate rewrites `server.php` overrides to `/API-1.3` automatically.

**Match console → SOAP host.** Live API Setup credentials (e.g. Reseller ID **25735** from `reseller.ds.network`) must use **production SOAP**. Sandbox console keys must use **soap-test**. Mixing live keys with soap-test (or vice versa) causes 401.

SOAP host resolution:

1. `DREAMSCAPE_SOAP_ENDPOINT` or `DREAMSCAPE_SOAP_URL` (full URL override)  
2. `DREAMSCAPE_SOAP_ENV` or `DREAMSCAPE_ENV` = `sandbox` \| `production`  
3. Else if `DREAMSCAPE_API_BASE_URL` is production REST → production SOAP  
4. Else → **sandbox** (`soap-test`) — safe default for local/dev  

**Get credentials:** Reseller Console → **Account Settings → API & WHMCS → API Setup** — copy **Reseller ID** + **API Key**.

### 401 checklist (what Ben should set)

**Live API Setup (reseller.ds.network) — Reseller ID 25735 + live key → SOAP production:**

```bash
DREAMSCAPE_RESELLER_ID=25735
DREAMSCAPE_API_KEY=<from live API Setup>
DREAMSCAPE_API_MODE=soap
DREAMSCAPE_SOAP_ENV=production
```

**Sandbox console (reseller.sandbox.ds.network) → SOAP soap-test:**

```bash
DREAMSCAPE_RESELLER_ID=<sandbox reseller id>
DREAMSCAPE_API_KEY=<from sandbox API Setup>
DREAMSCAPE_API_MODE=soap
DREAMSCAPE_SOAP_ENV=sandbox
# Optional override:
# DREAMSCAPE_SOAP_ENDPOINT=https://soap-test.secureapi.com.au/API-1.3
```

**If using official REST only (no Reseller ID):**

```bash
DREAMSCAPE_API_MODE=rest          # required if Reseller ID is also set but you want REST
DREAMSCAPE_API_KEY=<sandbox key>
DREAMSCAPE_API_BASE_URL=https://reseller-api.sandbox.ds.network
# Do NOT expect Reseller ID to fix REST 401s
```

| Step | Action |
|------|--------|
| **1. Pick mode** | Reseller ID story → SOAP. Signature-only docs → REST. |
| **2. Match env** | Live console → `DREAMSCAPE_SOAP_ENV=production`. Sandbox console → `sandbox` (default). |
| **3. Keys** | From matching console. No spaces/quotes. Regenerate if ever pasted into chat. |
| **4. Redeploy** | Vercel env for Production + Preview + Development; redeploy after changes. |
| **5. IP whitelist** | REST sandbox: no IP whitelist (support). Production REST/SOAP may need static egress (`DREAMSCAPE_HTTPS_PROXY` / Vercel Static IPs). |

Staff: Domains UI shows SOAP host; availability `?debug=1` returns mode + endpoint metadata (never the key). Logs: `[dreamscape] soap request` or `[dreamscape] request auth`.

#### Local smoke (SOAP)

1. Set `DREAMSCAPE_RESELLER_ID`, `DREAMSCAPE_API_KEY`, and matching `DREAMSCAPE_SOAP_ENV` in `.env.local`.
2. `npm run dev` → Domains availability search (UI shows SOAP host).
3. Server log should show `[dreamscape] soap request` with the expected host (`soap-test` or `soap.secureapi.com.au`).

#### Local smoke (REST)

1. Set `DREAMSCAPE_API_KEY` + sandbox REST base URL; leave Reseller ID unset **or** set `DREAMSCAPE_API_MODE=rest`.
2. Logs show `[dreamscape] request auth` with Api-Request-Id / Api-Signature.

```bash
# .env.local / Vercel — never commit real values

# --- Live API Setup → SOAP production ---
DREAMSCAPE_RESELLER_ID=
DREAMSCAPE_API_KEY=
DREAMSCAPE_API_MODE=soap
DREAMSCAPE_SOAP_ENV=production

# --- Sandbox console → SOAP soap-test ---
# DREAMSCAPE_SOAP_ENV=sandbox
# DREAMSCAPE_SOAP_ENDPOINT=https://soap-test.secureapi.com.au/API-1.3

# --- REST alternative (signature auth; no Reseller ID) ---
# DREAMSCAPE_API_MODE=rest
# DREAMSCAPE_API_KEY=
# DREAMSCAPE_API_BASE_URL=https://reseller-api.sandbox.ds.network
# Optional REST-only experiment (not official):
# DREAMSCAPE_SEND_RESELLER_ID=true

# Optional: static-IP HTTPS proxy (Fixie / QuotaGuard) — mainly production.
# DREAMSCAPE_HTTPS_PROXY=http://user:password@fixie.example.com:80
# Optional webhook (domain transfer Notification URL) — separate secret:
# DREAMSCAPE_WEBHOOK_SECRET=
```

> **Security:** Example API keys in Dreamscape’s public docs are **not** DigitalGate credentials. If any real API key or webhook secret was pasted into chat, tickets, or git history, **rotate** it in Reseller Console immediately and update Notification URL / Vercel env. Never paste secrets into chat again. Browser never holds the key — only `GET /api/v1/infrastructure/...` (and future routes) call Dreamscape (Node runtime).

### What to tell Dreamscape support if still stuck

1. Confirm whether **API Setup** credentials are for **SecureAPI SOAP** (`soap(-test).secureapi.com.au`) or **REST** (`reseller-api(.sandbox).ds.network`).  
2. We call SOAP `DomainCheck` with Authenticate header `{ ResellerID, APIKey }` — live keys against `https://soap.secureapi.com.au/API-1.3` (`DREAMSCAPE_SOAP_ENV=production`), sandbox keys against soap-test `/API-1.3`. Never use `…/server.php?v=1.3` (empty body).  
3. REST 401 with `{"status":false,"error_message":"Unauthorized"}` while using Reseller ID is expected — Reseller ID is **not** part of REST auth.  
4. Ask them to verify Reseller ID **25735** + the matching API key are enabled for the SOAP host in use, and whether IP allowlisting applies.

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
- If the webhook secret was exposed (chat, ticket, logs): **rotate** `DREAMSCAPE_WEBHOOK_SECRET` in Vercel, redeploy, and update the Notification URL in Reseller Console to the new `?secret=` value.
- **Today:** `POST` acknowledges `200`, classifies transfer/status payloads, updates matching `InfrastructureDomain` status when present, persists to Neon `DreamscapeWebhookEvent` (plus in-memory hot cache).
- Route: `src/app/api/webhooks/dreamscape/route.ts` · helpers: `providers/dreamscape/webhooks.ts`

---

## Go-live path (Domains → Website)

```
Business Profile (ABN for .au)
  → Upsert provider contact (SOAP ContactCreate / REST customer)
  → Search domain (SOAP DomainCheck)
  → Register (SOAP DomainCreate) OR Connect existing
  → Persist InfrastructureDomain on Organisation
  → Apply hosting DNS (SOAP DomainDNSUpdate → CNAME/A to Vercel)
  → Attach custom hostname (VERCEL_* optional) · SSL auto
  → Website Studio “Make it live” (publish + checklist)
  → Custom Host → middleware → /sites/by-host → /sites/[slug]
```

### Safety — paid registration

| Gate | Detail |
|------|--------|
| Org flag `infra.domain_register` | Must be `true` (Command Centre → Flags) |
| Typed confirm | Body `confirmDomain` must equal the FQDN |
| Production | Also requires `confirmProduction: true` |
| Kill-switch | `DG_DOMAIN_REGISTER_ENABLED=0` blocks globally |

### Key APIs

| Method | Path |
|--------|------|
| GET | `/api/v1/infrastructure/domains/availability?q=` |
| GET/POST | `/api/v1/infrastructure/domains` (`action: register \| connect`) |
| GET/POST | `/api/v1/infrastructure/domains/[id]/dns` (`applyHosting`) |
| GET/POST | `/api/v1/infrastructure/customer` |
| GET/POST | `/api/v1/infrastructure/go-live` |
| POST | `/api/webhooks/dreamscape` |

### Prisma

- `InfrastructureDomain` — org inventory + website bind + DNS/SSL state  
- `DreamscapeCustomerLink` — org ↔ SOAP contact / REST customer id  
- `DreamscapeWebhookEvent` — durable transfer / status notification log  

### Production SOAP checklist (AU pilot — Ben)

Vercel **Production** env (then Redeploy):

| Var | Value |
|-----|--------|
| `DREAMSCAPE_RESELLER_ID` | Live API Setup Reseller ID (e.g. `25735`) |
| `DREAMSCAPE_API_KEY` | Live API Setup key (32 hex, no quotes) |
| `DREAMSCAPE_API_MODE` | `soap` |
| `DREAMSCAPE_SOAP_ENV` | `production` → `https://soap.secureapi.com.au/API-1.3` |
| `DREAMSCAPE_WEBHOOK_SECRET` | Random secret ≠ API key; Notification URL `?secret=` |
| `DG_DOMAIN_REGISTER_ENABLED` | Leave unset/`1` when ready; `0` = global kill-switch |
| Org flag `infra.domain_register` | Command Centre → Flags → `true` before paid register |
| Optional | `VERCEL_TOKEN` + `VERCEL_PROJECT_ID` (+ `VERCEL_TEAM_ID`) — attach apex+www **and** pull recommended DNS |
| Optional | `DREAMSCAPE_HTTPS_PROXY` if Dreamscape requires static egress |

**Do not set** `DREAMSCAPE_SOAP_ENDPOINT=…/server.php?v=1.3` (empty body). Prefer `DREAMSCAPE_SOAP_ENV=production` so code picks `/API-1.3`.

**Live smoke (Ben):**

1. Domains → search a `.com.au` — UI should show `SOAP · soap.secureapi.com.au (production)`.  
2. Connect an existing domain (no charge) → Apply website DNS.  
3. Website Studio → Make it live (apply DNS + publish).  
4. Paid register only with flag + typed confirm + production checkbox.  
5. Confirm Notification URL still points at `/api/webhooks/dreamscape?secret=…`.

### Hosting DNS env

Apex **must** be an A record — Dreamscape rejects CNAME on the root zone (`Invalid CNAME Record … Subdomain: CNAME cannot be set on the root zone`).

**Target resolution order**

1. Both `DG_WEBSITE_DNS_A_TARGET` + `DG_WEBSITE_DNS_CNAME_TARGET` set → use env  
2. Else if `VERCEL_TOKEN` + `VERCEL_PROJECT_ID` → attach apex+www, then `GET /v6/domains/{host}/config` recommended IPv4 / CNAME  
3. Else legacy anycast (`76.76.21.21` + `cname.vercel-dns.com`) — still works but Vercel UI often stays **Invalid** until project-specific records are used  

```bash
# Preferred — project-specific recommended DNS + auto attach:
VERCEL_TOKEN=
VERCEL_PROJECT_ID=
# VERCEL_TEAM_ID=

# Optional hard overrides (skip Vercel recommendations when both set):
# DG_WEBSITE_DNS_A_TARGET=216.198.79.1
# DG_WEBSITE_DNS_CNAME_TARGET=xxxx.vercel-dns-017.com

# DG_DOMAIN_REGISTER_ENABLED=1
```

Apply website DNS / Make it live writes apex A + www CNAME using the resolved targets above.

**DNS console:** Infrastructure → **DNS** (`/apps/infrastructure/dns`) — domain picker, zone inspect (NS + live records), suggested hosting table, **Apply www only** / **Apply website DNS**, and manual registrar instructions when the zone isn’t writable.

**Progressive apply:** DNS (or Domains) → **Refresh zone** / **Inspect DNS** (DomainInfo + NS; `secureparkme` counts as Dreamscape parking NS) → **Apply www only** (safer) → **Apply website DNS** (apex A + www; auto-falls back to www on SOAP HTTP 500). If Vercel stays Invalid after legacy targets, remove/re-add the hostname in Vercel Domains (or set Vercel token so Apply uses recommended records).

### Email auth DNS (E1)

Infrastructure → **Email**: Prepare sending domain (Resend) → **Apply auth DNS** (Dreamscape DomainDNSUpdate including **TXT**) → Check verification. Requires domain in Domains inventory + `RESEND_API_KEY`. Does not replace apex website A/www. See [EMAIL-INFRASTRUCTURE.md](./EMAIL-INFRASTRUCTURE.md).
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
| Domains UX | `/apps/infrastructure/domains` |
| DNS console | `/apps/infrastructure/dns` · `src/components/infrastructure/DnsConsole.tsx` |
| Overview helper | `getDigitalInfrastructureOverview` |
