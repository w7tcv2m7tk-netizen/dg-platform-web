# Platform application access policy

Status: owner-approved policy, 5 November 2026; local implementation verified; Production remains unverified.
Requirements: `platform.auth`, `crm.companies`, `detach.portal_billing`, `platform.roadmap`.
Approval provenance: owner request “P0 Access Restoration, Architecture Reconciliation & Regression Prevention”, 5 November 2026. This policy reconciles current source with that explicit approval; it does not attest deployed configuration or alter the commercial lock.

## Growth and Industry architecture

Growth navigation order is Prospecting, Marketing, Advertising, AI Visibility, SEO, Social, Reputation, Automation, Analytics. Reputation uses the existing `reviews` runtime. Advanced AI Communications remains the Core Communications add-on, not a tenth Growth App. Existing enabled-app settings remain authoritative for configuration; exemption does not automatically install every application.

Parent Industry Apps remain commercial verticals; specialised business types remain children, never independent parent SKUs. The canonical code is `industry/platform.ts`, `industry/catalogue.ts` and `apps/industry-taxonomy.ts`; no children are invented here. Property contains Real Estate, Property Management and Commercial Property. Hospitality & Accommodation remains separate from Property. Services and Finance retain their existing exact catalogue children.

The August `INDUSTRY-PLATFORM.md` parent-only sidebar wording is historical. The later specialised experience in the existing implementation and the owner's current approval preserve distinct child experiences under the parent taxonomy. Route identity is resolved from each authenticated organisation's exact selected template. A shared runtime must not reveal or select sibling business types.

## Authority and exemptions

`hasPlatformAuthority()` remains the sole operator authority: verified `dg:staff`, or the authenticated owner of an organisation whose immutable ID is in `DG_COMMAND_CENTRE_ORG_IDS`. API-key principals never gain operator authority. Membership, tenant filters, feature permissions and independently authorised cross-tenant workflows remain mandatory.

Canonical `PlatformSubscription.platformExempt === true` on a row matching the authenticated organisation ID grants commercial subscription exemption. Editable names, slugs, profile JSON, browser flags, sales pipeline entries and email addresses do not grant it. No new subscription, purchase projection, Stripe customer or transaction is fabricated. Failed authority reads deny commercial access.

The owner's intended exemption roster is DigitalGate (operator authority separately required), Roe Realty, Currumbin Valley Hideaway, Aëtherra, Wantd and Harbour & Co (existing demo/ranking treatment retained). These names document policy only. Exact immutable Production identities, flags, chosen industries and runtime configuration remain UNVERIFIED until separately approved read-only verification. No name-based provisioning or automatic data correction is permitted. AIM Financial remains subject to its purchased configuration; My Venue Clean's pipeline status is not billing evidence.

Exemption permits authorised configured Growth/Industry functionality and commercial activation without a paid Stripe subscription. It never grants Command Centre, expands membership permissions, bypasses tenant selection, activates unfinished applications or enables missing rollout flags. Exemption-only activation preserves current flags, including explicit false. Existing normal customer purchase activation and verified operator enrolment behaviour remain unchanged. Specialist integration exemption removes the commercial tier/purchase condition only; selection, application installation and provider/security prerequisites remain enforced.

## Shared enforcement

- `access/application-authority.ts`: exact-tenant canonical exemption and separately actor-bound operator decision.
- `session/index.ts` and `platform-api.ts`: server-derived exemption projection; no client authority.
- `features/access.ts`, premium page layout, Industry page/API decision: common commercial policy plus existing permissions.
- Finance's additional gate accepts only explicitly supplied authenticated actor context, never inferred operator identity from an organisation alone.
- Industry entitlement resolution has a separately named commercial exemption; canonical purchased-app arrays remain truthful.
- Shell/provider use server-resolved authority for navigation. Browser visibility cannot authorise API access.
- Global checkout gate, admission controls, Stripe verification, subscription lifecycle and existing demo exclusions are unchanged.

## Customer language

Industry access-denied surfaces say “Not enabled for this organisation” and “Contact DigitalGate”. Unavailable capabilities may say “Coming Soon”. Internal beta identifiers and rollout controls are retained; presentation does not assert readiness of unfinished modules.

## Regression evidence and release gates

`scripts/test-application-access-policy.mjs` executes actual shared decisions and activation handlers with synthetic records, including negative identity, tenant, operator, API-key, unpaid, rollout and selection cases. Existing platform-authority, API-key, Finance, industry isolation, checkout, billing exemption, navigation and security suites remain required. Synthetic roster labels are not Production identity certification.

Production deployment, data changes, exemption provisioning, migration, checkout opening and customer invitation remain HOLD pending separate owner approval. Live Business Brain rules were unavailable for this local task; no seed or historical chat was promoted to live approved knowledge. The approved commercial documents remain unchanged.

A repaired SKU lookup resolves individual Growth Apps before bundle expansion; free Reputation has no paid key. This corrects access projection only and changes no price or Stripe catalogue. Local final checkout suite: 701/701; full build: 457 pages.
