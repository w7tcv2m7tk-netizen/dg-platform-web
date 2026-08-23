# Connector Specification

**Canonical architecture:** [../foundations/CONNECTOR-ENGINE.md](../foundations/CONNECTOR-ENGINE.md)  
**Priority stack / DigitalGate 15:** [../foundations/CONNECTOR-PRIORITY.md](../foundations/CONNECTOR-PRIORITY.md)

This page is the short operational summary. Framework + Listing Hub live in **Connector Engine**; which connectors we build (and refuse) live in **Connector Priority**.

---

## Contract (summary)

Connectors are **not** the platform. They sync via **Platform API** into Universal Objects.

Every connector must cover: identity, auth, sync modes, object mapping, health, events — plus credentials, webhooks, logs, rate limits, permissions, disconnect/reconnect, manual sync, and data ownership (full table in Connector Engine).

---

## Live today

| Connector | Notes |
|-----------|--------|
| **WordPress** | Gen 1 plugin → Gen 2 slim connector; leads, properties, Acc stays |
| **Stripe** | Platform billing + Commerce Payment Engine |
| **Domain** | OAuth + Listings Management · **sandbox vs prod** via `DOMAIN_API_PATH_PREFIX` (`/sandbox` vs Primary `/v1`) — see UI + [Domain docs in Connector Engine](../foundations/CONNECTOR-ENGINE.md) |
| **REA** | Partner client_credentials + agency bind · upload accept → **pending** (not live published until report) — [REA.md](./REA.md) |
| **Google GBP** | OAuth + accounts/locations sync · **reviews limited** when My Business API denies — [GOOGLE-GBP.md](./GOOGLE-GBP.md) |
| **Cotality (CoreLogic)** | **Sandbox by default** (`api-sbox`) · Address Match + Property Details — [COTALITY-CORELOGIC.md](./COTALITY-CORELOGIC.md) |

## Explicitly parked (this programme)

| Connector | Status |
|-----------|--------|
| **Xero** | Parked — accounting template label-only until adapter ships |
| **Google Search Console (GSC)** | Parked as a connector product; DigitalGate marketing 404s use legacy redirects only |
| **Meta Ads** | Parked — no adapter chase in Industry floors programme |
| **OTA native APIs** (Airbnb / Booking.com) | Parked — iCal import + cron (Pro+) only |

## Business Services connectors (honest)

Under Core **Business Services** → customer **Business Setup / Start Your Business** ([BUSINESS-SETUP.md](../foundations/BUSINESS-SETUP.md)):

| Connector | Notes |
|-----------|--------|
| **ABR** | **Live** (GUID-gated) — `SearchByABNv202001` / `SearchByASICv201408` via Business Identity + Discovery (`ABN_LOOKUP_GUID` / `ABR_GUID`) — **verify / enrich only**; not registration. |
| **ASIC** | Stub — `pending_provider_approval`. DSP APIs exist (no access fee); apply via webservices@asic.gov.au → test env → then build. **No production registration / no scrape.** Customer UI never says “ASIC.” |
| **Dreamscape** | Infrastructure reseller (domains/hosting/SSL/email) — customer UX = DigitalGate Domains/Hosting/Email. |
| **Google / Social** | Digital Identity pillar — GBP OAuth + location/profile sync; reviews into Reputation when API allows; social as shipped. |

Code: `packages/platform-core/src/connectors/` (+ `commerce/connectors/stripe/`). Cotality: [COTALITY-CORELOGIC.md](./COTALITY-CORELOGIC.md). GBP: [GOOGLE-GBP.md](./GOOGLE-GBP.md). REA: [REA.md](./REA.md).

---

## Priority queue

See **[CONNECTOR-PRIORITY.md](../foundations/CONNECTOR-PRIORITY.md)**:

- **Immediate programme:** ABR · ASIC (apply) · Dreamscape · Google · Stripe · REA · Domain · RP Data / CoreLogic  
- **DigitalGate 15:** Stripe → ABR ✅ → ASIC → Google → Dreamscape → WordPress → Domain → REA → CoreLogic → Meta → OpenAI → ElevenLabs → Xero → Twilio/comms → Cloudflare  
- **Anti-priority:** do not chase 50 one-off integrations

REA / Domain = **start of the RE ecosystem**, not the centre of DigitalGate. Listing Hub: [PROPERTY-SYNDICATION.md](../foundations/PROPERTY-SYNDICATION.md).

---

## Rules

1. Connectors call **Platform API only** — no direct DB  
2. Idempotent sync (external ID on object / placement)  
3. Failures retried with backoff; dead-letter at scale  
4. Credentials encrypted per org  
5. Prefer webhooks over polling  
6. Country Pack / `countries[]` on manifests where relevant  
