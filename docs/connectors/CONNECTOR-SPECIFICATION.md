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
| **Domain** | OAuth + status / connect (Listing Hub path) |
| **Google GBP** | OAuth scaffold |
| **Cotality (CoreLogic)** | Sandbox OAuth + Address Match → address resolve enrichment |

## Business Services connectors (honest)

Under Core **Business Services** → customer **Business Setup / Start Your Business** ([BUSINESS-SETUP.md](../foundations/BUSINESS-SETUP.md)):

| Connector | Notes |
|-----------|--------|
| **ABR** | **Live** (GUID-gated) — `SearchByABNv202001` / `SearchByASICv201408` via Business Identity + Discovery (`ABN_LOOKUP_GUID` / `ABR_GUID`) — **verify / enrich only**; not registration. |
| **ASIC** | Stub — `pending_provider_approval`. DSP APIs exist (no access fee); apply via webservices@asic.gov.au → test env → then build. **No production registration / no scrape.** Customer UI never says “ASIC.” |
| **Dreamscape** | Infrastructure reseller (domains/hosting/SSL/email) — customer UX = DigitalGate Domains/Hosting/Email. |
| **Google / Social** | Digital Identity pillar — GBP scaffold; social as shipped. |

Code: `packages/platform-core/src/connectors/` (+ `commerce/connectors/stripe/`). Cotality: [COTALITY-CORELOGIC.md](./COTALITY-CORELOGIC.md).

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
