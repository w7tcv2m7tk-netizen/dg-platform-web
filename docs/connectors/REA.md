# realestate.com.au (REA Group) connector

**Status:** REA Partner — **verified** ✅ · Partner Platform **client wired** · agency activation **required per org** · upload path **implemented** (accept → `pending`) · **not** “live published” until report + agency listings flow  
**Parent:** [PROPERTY-SYNDICATION.md](../foundations/PROPERTY-SYNDICATION.md) · [CONNECTOR-ENGINE.md](../foundations/CONNECTOR-ENGINE.md)  
**Manifest:** `rea` in Connector Engine planned manifests (`priorityTier` 1 / DigitalGate 15 rank 8)

**Architecture path:** DigitalGate Platform → Real Estate App → REA Connector → realestate.com.au

> **Security:** Partner API credentials (`REA_CLIENT_ID`, `REA_CLIENT_SECRET`, tokens) live in **Vercel / server-side env only** — never in git, marketing, or client bundles. Rotate in REA partner console + Vercel if exposed.

**Public docs:** [Partner Platform](https://partner.realestate.com.au/) · [Authentication](https://partner.realestate.com.au/getting-started/authentication/) · [Listing Upload](https://partner.realestate.com.au/listing-upload/overview/) · [Integrations](https://partner.realestate.com.au/integrations/overview/)

---

## How REA differs from Domain

| | **Domain** | **REA** |
|---|------------|---------|
| Developer access | Public [developer.domain.com.au](https://developer.domain.com.au) | **Verified REA Partner** — credentials issued; agencies activate via Ignite / Change of Uploader |
| Auth | Authorization Code (agency user context) | **Client credentials only** (system-to-system) |
| First publish path | Listings Management REST (`PUT …/listings/residential`) + optional `/sandbox` prefix | **Listing Upload API** — `POST /listing/v1/upload` with **REAXML** (`text/xml`) |
| Agency binding | OAuth connect stores org token + Domain agency id | Bind **REA agency id** (`agentID` / Integrations `ownerId`) per org |
| Honest MVP today | Org connect + queued upsert (`pending`) | Platform token + agency activate + upload accept (`pending`) — never fake “published” |
| Env prefix | `DOMAIN_*` | `REA_*` |

Same product shape: DigitalGate Property (Listing SoT) → syndication adapter → portal. UI panels sit side-by-side on Property detail.

---

## Env vars (Vercel / `.env.local`)

| Env | Purpose |
|-----|---------|
| `REA_CLIENT_ID` | Partner Platform client id — **Vercel / server env only, never commit** |
| `REA_CLIENT_SECRET` | Client secret — **Vercel / server env only, never commit** |
| `REA_API_BASE_URL` | Default `https://api.realestate.com.au` |
| `REA_AUTH_TOKEN_URL` | Default `{REA_API_BASE_URL}/oauth/token` |
| `REA_OAUTH_SCOPES` | Optional — usually omit; scopes come from agency grants on the token |

Deprecated / unused for Partner Platform (kept only for old scaffold notes):

- `REA_REDIRECT_URI`, `REA_AUTH_AUTHORIZE_URL` — **no Authorization Code flow**

Without `REA_CLIENT_ID` + `REA_CLIENT_SECRET`, status reports **not configured**.

---

## Routes

| Route | Behaviour |
|-------|-----------|
| `GET /api/v1/connectors/rea/status` | Platform client-credentials probe (`/me/v1/integrations`) + org agency bind |
| `POST /api/v1/connectors/rea/activate` | Body `{ reaAgencyId }` — bind org to agency (prefers match from Integrations list) |
| `POST /api/v1/connectors/rea/disconnect` | Clears org agency binding |
| `GET /api/connectors/rea/connect` | Redirects to Connectors with honest “no OAuth redirect” message |
| `GET /api/connectors/rea/callback` | Legacy — same honest redirect |
| `POST /api/v1/properties/[id]/syndicate/rea` | REAXML upload → `externalRefs.rea` **pending** |

UI:

- Settings → Connectors → **realestate.com.au (REA)** card (activate agency id)
- Property detail → **REA syndication** panel (Publish when credentials + agency bound)

---

## Code map

```
packages/platform-core/src/connectors/rea/
  auth.ts              # Client credentials, integrations probe, agency activate
  reaxml.ts            # Pure REAXML builder + validation (fail closed)
  listings.ts          # Upload/report + re-exports
  publish-property.ts  # Property → upload → pending placement
  index.ts

packages/platform-core/src/real-estate/syndication/
  rea-adapter.ts

src/app/api/v1/connectors/rea/status|activate|disconnect/
src/app/api/connectors/rea/connect|callback/
src/app/api/v1/properties/[id]/syndicate/rea/
src/components/settings/ReaConnectorPanel.tsx
src/components/re/ReaSyndicationPanel.tsx
```

Placement key: `property.externalRefs.rea` — mirror Domain’s `externalRefs.domain`.  
Status must stay `pending` / `error` until a Listing Upload **report** confirms (and you treat listings as live). **Never** set `published` on HTTP 202 alone.

Required upload scope (per agency grant): `listing:listings:write`.

---

## Enable checklist (Ben)

1. Confirm Partner Platform credentials on Vercel (`REA_CLIENT_ID` / `REA_CLIENT_SECRET`). Optional: leave `REA_API_BASE_URL` unset (defaults to production host).
2. **Agency activation** — Roe (then founding agencies) activate DigitalGate via Ignite / Change of Uploader so `GET /me/v1/integrations` lists their `ownerId`.
3. Settings → Connectors → REA → enter agency id → **Activate agency**.
4. Confirm org probe shows `listing:listings:write` when Integrations returns scopes.
5. Property with address + suburb/state/postcode → REA syndication → **Publish to REA**.
6. Expect placement **pending** + `uploadId` (optional `progress` / `result` from one-shot report poll). Not a fake “Published on REA”.

**Still blocked without partner ops:** sandbox agency id (if REA issued one), live listing visibility on realestate.com.au, withdraw UI, webhook status sync.

**Public / marketing honesty:** say **REA Partner-enabled / integration in progress** — not “live REA publishing” until Roe uploads process cleanly and listings appear as expected.

---

## REAXML mapping (Gen 2 → residential)

Builder: `buildReaListingXml` in `packages/platform-core/src/connectors/rea/reaxml.ts` (upload helpers remain in `listings.ts`).  
Fails closed — upload is not attempted when mandatory create fields are missing.

### Emitted for residential create (`status="current"`)

| Gen 2 field | REAXML element |
|-------------|----------------|
| Org REA agency id | `agentID` (6 letters) |
| `dg-{propertyId}` (sanitised) | `uniqueID` |
| `metadata.authority` / inferred from `metadata.auction_date` | `authority` (`sale` \| `auction` \| `setsale`; deprecated exclusive→sale) |
| `metadata.auction_date` / `set_sale_date` | `auction@date` (required when authority is auction/setsale) |
| `status === under_offer` | `underOffer@value` |
| Publish contact (membership / org profile) | `listingAgent` (`name`, optional `telephone@type=mobile`, `email`) |
| `listingPriceCents` | `price` (AUD dollars; must be > 2900) |
| `metadata.display_as_contact_agent` | `price@display="no"` + `priceView` = `Contact Agent` (or `marketing.priceView`) |
| `marketing.priceView` / `metadata.price_view` | `priceView` (max 50) |
| `addressLine1` (parsed) | `address` → `subNumber?`, `streetNumber`, `street` |
| `suburb` / `state` / `postcode` / `country` | `suburb`, `state` (lower), `postcode` (4-digit), `country` (`AUS`) |
| `metadata.address_display` / `streetview` | `address@display`, `address@streetview` (default yes) |
| `propertyType` | `category@name` (House, Apartment, Unit, …) |
| `marketing.headline` | `headline` (max 150; HTML stripped) |
| `marketing.description` | `description` (HTML stripped; XML-escaped) |
| `bedrooms` / `bathrooms` | `features/bedrooms`, `features/bathrooms` (Studio → `bedrooms=Studio`) |
| `metadata.lock_up_garages` / `car_spaces` / `carports` | `garages` / `openSpaces` / `carports` |
| `marketing.features` (text) | boolean feature children when keywords match; remainder → `otherFeatures` |
| `metadata.land_size` | `landDetails/area` |
| `metadata.building_size` / `energy_rating` | `buildingDetails/area`, `energyRating` |
| `metadata.inspection_times` (newline-separated) | `inspectionTimes/inspection` |
| `metadata.images` (+ `featured_image`) | `images/img` — first id=`m` (required) |
| `metadata.floorplans` | `objects/floorplan` (max 2) |
| VIC `disclosureStatement` PDF / `statementOfInformation` / explicit SOI URL | `media/attachment@usage=statementOfInformation` |

### Status transitions

| Gen 2 `status` | REAXML |
|----------------|--------|
| `listed` / `under_offer` / `contract_signed` / `unconditional` / … | `residential status="current"` (`underOffer` only when `under_offer`) |
| `sold` | Minimal `status="sold"` + `soldDetails` (`soldPrice` from `metadata.sold_price_cents` or `listingPriceCents`, `soldDate`) |
| `withdrawn` | Minimal `status="withdrawn"` (`agentID` + `uniqueID` only) |

### Rental (optional)

Emitted only when `metadata.listing_type` is `rent` / `rental` / `lease`. Requires `rent` (`metadata.rent_cents` or `listingPriceCents`), `dateAvailable`, plus the same address / category / beds / baths / images rules. Allowances from `pet_friendly` / `furnished` / `smokers`.

### Not yet mapped (honest scope)

| REAXML root / area | Status |
|--------------------|--------|
| `commercial` (+ commercialAuthority, commercialCategory, commercialRent, …) | Not mapped — builder fails closed if `propertyType` is commercial-like |
| `rural` (+ ruralCategory, ruralFeatures, …) | Not mapped |
| `land` (+ landCategory, estate, lotNumber-centric flow) | Not mapped (`propertyType` land/vacantland fails closed) |
| Project Profile (`project/id`, `order`) | Not mapped |
| Conjunctional `listingAgent` / `uniqueListingAgentID` | Not mapped (single primary agent only) |
| `vendorDetails`, `municipality`, `streetDirectory`, `externalLink`, `videoLink` | Not mapped |
| Full feature enum beyond keyword heuristics | Partial — unmapped flags stay off |
| Suburb↔postcode↔state REA location DB check | Not done client-side (REA validates on upload) |

### Validation enforced before upload

- `agentID` = 6 letters; `uniqueID` present, ≤50, no spaces  
- Address: parseable `streetNumber` (not `0`), `street`, suburb, AU state, 4-digit postcode, country `AUS`  
- `category`, `headline`, `description`  
- `bedrooms` + `bathrooms` (> 0; Studio exception)  
- Residential: numeric `price` > 2900 (hidden via `display="no"` when Contact Agent)  
- ≥1 image URL; main image id `m`  
- `listingAgent/name`  
- Auction/set-sale date when authority requires it  
- Sold: `soldPrice` + `soldDate`  
- Unsupported roots (land/rural/commercial) → clear error, no stub XML  

Unit tests: `scripts/test-rea-reaxml.mjs` (`npm run test:unit`).

---

## Related

- [PROPERTY-SYNDICATION.md](../foundations/PROPERTY-SYNDICATION.md) — Listing Hub + Domain MVP  
- [CONNECTOR-PRIORITY.md](../foundations/CONNECTOR-PRIORITY.md) — DigitalGate 15 (REA = 8)  
- Domain parallel: `packages/platform-core/src/connectors/domain/`
