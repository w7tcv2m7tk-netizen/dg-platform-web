# Business Services · Business Setup

**Status:** Architecture locked · Phase 1 Identify live-ish (ABR) · August 2026  
**Underlying capability:** **Business Services** — provider-agnostic Core capability  
**Customer-facing:** **Business Setup** / **Start Your Business** (never “ASIC” in the UI)  
**Classification:** Core platform capability / onboarding service — **not** a Growth App, **not** a standalone “Business Registration App”  
**Related:** [architecture/GEN-2-ARCHITECTURE-BRIEF.md](../architecture/GEN-2-ARCHITECTURE-BRIEF.md) (§4 Business Identity) · [BUSINESS-PROFILE.md](./BUSINESS-PROFILE.md) · [CONNECTOR-ENGINE.md](./CONNECTOR-ENGINE.md) · [CONNECTOR-PRIORITY.md](./CONNECTOR-PRIORITY.md) (DG15 / ABR·ASIC·Dreamscape·Google) · [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) · [BUSINESS-DISCOVERY.md](./BUSINESS-DISCOVERY.md) · [BRAND-STUDIO.md](./BRAND-STUDIO.md) · [REVIEWS-AND-REFERRALS.md](./REVIEWS-AND-REFERRALS.md) · [CAPABILITY-MODEL.md](../CAPABILITY-MODEL.md)

---

## Positioning

> **Start your business. Build your digital presence. Connect your systems. Run your business. Grow it — all through DigitalGate.**

| Layer | Name | Role |
|-------|------|------|
| **Capability** | Business Services | Provider-agnostic Core — orchestrates launch / identity / registration pathways |
| **Product surface** | Business Setup · Start Your Business | Tenant-facing Launchpad UX |
| **Core service** | Business Identity | Provider-neutral identity record → Business Profile |
| **AU registration adapter** | ASIC connector | One country implementation of a broader launch system (intl registries later) |
| **Identity enrichment** | ABR connector | ABN / ACN / entity verify — **not** registration |
| **Digital infra** | Dreamscape (via Infrastructure) | Domains, hosting, SSL, mailbox — customer UX never names the reseller |
| **Presence** | Google / Social connectors | GBP, social profiles |

**Not:**

| Mis-placement | Why wrong |
|---------------|-----------|
| Growth App | This is OS onboarding / launch, not a growth-loop SKU |
| Isolated “ASIC App” / “Business Registration App” | ASIC is an AU connector under Business Services |
| Hard-coded ABR/ASIC in Core domain | Providers plug in via Connector Framework |
| Staff Business Discovery | Discovery prospects *other* businesses; Setup is *tenant* launch |

Customer UX: **Business Setup** / **Start Your Business**. Docs and connector manifests may name ABR / ASIC / Dreamscape honestly.

---

## Architecture

```
                    DIGITALGATE CORE
                          │
                 Business Identity Service
                          │
         ┌────────────────┼────────────────┐
         │                │                │
        ABR             ASIC          (later)
   (ABN / ACN /      (names &         Dreamscape /
    entity verify)    companies —      Google /
                      DSP pending)     user input)
         │                │                │
         └────────────────┼────────────────┘
                          │
               Digital Business Profile
                          │
              ┌───────────┼───────────┐
              │           │           │
           Website      Email        CRM
              │           │           │
              └───────────┼───────────┘
                          │
         SEO · AI Visibility · Automation · Analytics
         (+ Reputation — Growth App on Core Universal Review)
```

**Country packs:** Australia = ABR + ASIC (stub). US / UK / other = future registry connectors. Product shape stays.

**Business Services** owns the capability. Connectors under it (AU first):

| Connector | Purpose | Status |
|-----------|---------|--------|
| **ABR** | ABN verification, ACN lookup, entity info, GST, business names | **Live** when GUID configured — `SearchByABNv202001`, `SearchByASICv201408` |
| **ASIC** | Business names & companies registration (when DSP approved) | Stub — `pending_provider_approval` |
| **Domain / Hosting** | Dreamscape reseller via Infrastructure Core | Infra paths |
| **Google** | GBP (+ related Google surfaces) | Connector scaffold |
| **Social** | Profile / publishing connectors (as they mature) | Partial |

---

## Start Your Business — launch stages

| Stage | Customer promise | Includes | Honest status |
|-------|------------------|----------|---------------|
| **1. Identify** | Who you are | Name shortlist · ABN / ACN verify via ABR · entity type/status | **Live-ish** when ABR GUID set |
| **2. Register** | Register the name | ASIC pathway (*later*) or honest handoff | **Blocked** on DSP |
| **3. Establish** | Lock identity in DG | Business Profile (legal / trading / contacts / GST) | Available |
| **4. Build** | Create presence | Website · brand/logo (**Brand Studio — roadmap**) · CRM · forms | Website / CRM live-ish; Brand Studio planned |
| **5. Connect** | How the world finds you | Domain · DNS · SSL · email · social · GBP | Infra / connectors exist or scaffolded |
| **6. Grow** | Improve and operate | SEO · AI Visibility · **Reputation** (Growth App) · Social · Ads · Automation · Analytics | Growth apps — no fake scores |

Stages are Launchpad checklist groups — not separate Apps.

---

## Authoritative flow (Identify → Register detail)

```
1. Identify
      → Search / shortlist business name (availability never invented)
      → ABN / ACN verify via ABR connector
      → Entity status / type / GST / business names where available
2. Register
      → ASIC Connector submit ONLY after DSP approval + test-env pass
      → otherwise hand off to official process with pre-prepared info where permitted
3. Establish
      → Digital Business Profile (canonical identity every App reads)
4. Build → Connect → Grow
      → Website / Email / CRM → connectors → growth surfaces
```

---

## ABR connector (approved access)

Ben’s ABN Lookup web services access is **approved**. The authentication GUID is an **API credential**:

| Rule | Detail |
|------|--------|
| **Store** | Server-only env — `ABN_LOOKUP_GUID` (preferred) or `ABR_GUID` / `ABR_AUTHENTICATION_GUID` |
| **Never** | Frontend, client JS, `NEXT_PUBLIC_*`, UI, public repo, committed `.env.local` |
| **Methods** | `SearchByABNv202001` (ABN), `SearchByASICv201408` (ACN) |
| **Also** | Name search via Discovery still uses `ABRSearchByNameAdvancedSimpleProtocol2017` |
| **APIs** | Auth-protected: `/api/v1/business-identity/abn`, `/api/v1/business-identity/acn`, `/api/v1/connectors/abr/*` |
| **Smoke** | `npm run abr:smoke` — exits clearly if GUID missing; never prints GUID |

If GUID is missing locally: paste from the ABR registration email into `.env.local` (see `.env.example` placeholders).

---

## ABR vs ASIC (critical)

| | **ABR** | **ASIC** |
|--|---------|----------|
| **Role** | ABN / ACN verification, entity enrichment, names linked to entities | Business **name** & **company** registration (AU) |
| **Does not** | Register business names | Replace ABR verify |
| **UI label** | “Verify ABN” / entity details — not “ABR product” | Never “ASIC” in customer chrome — “Register business name” / handoff |
| **Status** | Implemented — GUID-gated | Stub — `pending_provider_approval` |

### Explicit holds

- **No production ASIC registration workflow** until DSP application approved, test env green, legal/compliance signed off.
- **No screen-scraping** of government portals.
- **ABR ≠ registration.**
- Brand Studio remains **roadmap only** inside Build.
- Other holds unchanged: no digitalgate.com.au cutover; no fake MRR / AI SDR / citations; Reputation Growth App on Core plumbing (no decorative scores).

---

## ASIC digital service provider (DSP) path

ASIC exposes **Business Names** and **Companies Register** APIs for authorised digital service providers. **No API access fee**; access is by application.

**Ben checklist (do before any production registration build):**

1. Read ASIC digital services access terms & conditions  
2. Review API technical specifications (Business Names / Companies as needed)  
3. Email **webservices@asic.gov.au** — state which API(s) and DigitalGate purpose (Business Setup / Start Your Business under Business Services)  
4. Complete the DSP application  
5. If approved → obtain **test environment** + testing support  
6. Pass testing → production credentials / path  

**Engineering rule:** Architecture + UI shell around an **ASIC Connector** now. Develop against the **test environment only after approval**. Do **not** invent availability results or claim registration success.

Connector status constant: `pending_provider_approval` until step 5+.

---

## Connector boundaries

```
Business Services (Core capability)
        │
        ├── Product: Business Setup / Start Your Business
        │
        ├── Business Identity Service  → merges ABR (+ ASIC/domain/Google/user later)
        ├── ABR connector              → SearchByABNv202001, SearchByASICv201408
        ├── ASIC connector             → search / register (gated)
        │                                 status: pending_provider_approval
        ├── Infrastructure             → Dreamscape domains / DNS / SSL / mailbox
        ├── Google connector           → GBP (and related)
        └── Social connectors          → as shipped
```

| Concern | Owner |
|---------|--------|
| Launchpad UX, six stages, eligibility | Business Setup (product of Business Services) |
| ABN / ACN / entity enrichment | ABR connector → Business Identity |
| Name / company registration API | ASIC connector (blocked until DSP) |
| Domain / hosting / email / SSL | Infrastructure Core |
| Canonical identity | Business Profile |
| Staff prospecting | Business Discovery — shares ABR GUID / adapter; different surface |

Code:

| Path | Role |
|------|------|
| `docs/foundations/BUSINESS-SETUP.md` | This lock |
| `packages/platform-core/src/business-setup/` | Types, stages, checklist, phase helpers |
| `packages/platform-core/src/business-identity/` | Provider-neutral identity + ABR → Profile mapping |
| `packages/platform-core/src/connectors/abr/` | ABR client (latest methods) |
| `packages/platform-core/src/connectors/asic/` | ASIC stub (`pending_provider_approval`) |
| `/dashboard/business-setup` | Start Your Business shell |
| `/dashboard/business` | Business Profile — Verify ABN / Look up ACN |

---

## Phased roadmap

| Phase | Scope |
|-------|-------|
| **0** | Docs · Business Services naming · ABR/ASIC stubs · honest Start Your Business UI shell |
| **1** | **Identify** — ABR verify → Business Identity → Business Profile; registration = handoff |
| **2** | **Establish / Connect** — domain / Dreamscape checklist wired |
| **3** | **Build** — website / email / CRM links; Brand Studio still roadmap |
| **4** | ASIC Connector against **test** env after DSP approval |
| **5** | ASIC production path only after test pass + legal sign-off |

---

## Explicit non-goals (current)

- Production ASIC registration submit  
- Screen-scraping ABR or ASIC  
- Customer-facing “ASIC” branding  
- Standalone marketplace SKU for registration  
- Fake name availability or registration success  
- Implementing Brand Studio in this workstream  
- Clobbering Services App / Growth / Cotality WIP  
- Exposing ABR GUID to any client surface  

---

## Recommended next step

1. **Ben (ops):** Paste ABR authentication GUID into `.env.local` as `ABN_LOOKUP_GUID=` (or `ABR_GUID=`), then run `npm run abr:smoke`.  
2. **Ben (ops):** Continue ASIC DSP checklist in parallel (`webservices@asic.gov.au`).  
3. **Eng:** Persist verified ABR fields onto org profile on Save (UI already applies patch); optional name-search in Identify stage.
