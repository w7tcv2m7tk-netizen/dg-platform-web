# Cotality / CoreLogic Asia (RP Data)

**Connector id:** `corelogic`  
**Category:** Property (Connector Engine)  
**Auth:** OAuth2 **client credentials** (platform-level client)  
**Portal:** [developer.corelogic.asia](https://developer.corelogic.asia)  
**Client:** DigitalGate Property Data (`digitalgate-property-data`)

DigitalGate integrates Cotality as a **Connector**, not as hard-coded Core domain logic. Address Match feeds the existing address resolve path; AVM / Market Insights / Search / etc. plug in the same client later.

---

## Env (server-only)

| Variable | Required | Notes |
|----------|----------|--------|
| `CORELOGIC_CLIENT_ID` | yes | OAuth client id |
| `CORELOGIC_CLIENT_SECRET` | yes | **Never commit.** Paste into `.env.local` / Vercel only |
| `CORELOGIC_TOKEN_URL` | no | Default: `https://api-sbox.corelogic.asia/access/as/token.oauth2` |
| `CORELOGIC_API_BASE` | no | Optional override; Search defaults use this if `CORELOGIC_SEARCH_BASE` unset |
| `CORELOGIC_SEARCH_BASE` | no | Default sandbox: `https://api-sbox.corelogic.asia/search` |
| `CORELOGIC_CLIENT_NAME` | no | Address Match `clientName` query; default `digitalgate-property-data` |
| `CORELOGIC_MATCH_PROFILE_ID` | no | Default `1` |

Aliases: prefer `CORELOGIC_*` (not `COTALITY_*`) for consistency with existing Domain/Google env naming.

---

## Wired today (sandbox)

| Capability | Status | Path / notes |
|------------|--------|----------------|
| OAuth2 token | **Live** | `POST` token URL, HTTP Basic, `grant_type=client_credentials`; in-memory cache until near expiry |
| Address Match | **Live** | `GET {searchBase}/au/matcher/address?q=&clientName=&matchProfileId=` — response nests under `matchDetails` |
| Address resolve enrichment | **Live** | `/api/v1/addresses/resolve` — optional when credentials present; `corelogic: false` skips |
| Property create / geocode | **Live** | `createProperty` / address refresh call `resolveAddress` → persist Cotality id |
| Property match action | **Live** | `PATCH /api/v1/properties/:id` `{ action: "match_cotality" }` |
| Status probe | **Live** | `GET /api/v1/connectors/corelogic/status` (auth) |
| Direct match API | **Live** | `POST /api/v1/connectors/corelogic/address-match` (auth) |

Code: `packages/platform-core/src/connectors/corelogic/` + `packages/platform-core/src/properties/`

### Property storage

| Field | Location | Notes |
|-------|----------|--------|
| `corelogic_property_id` | `Property.externalRefs` **and** `Property.metadata` | Canonical Cotality property id for later AVM |
| `corelogic_match_type` | `Property.metadata` | E/A/P/F/… from Address Match |
| `corelogic_matched_address` | `Property.metadata` | Cotality single-line when returned |
| `corelogic_source` | `Property.metadata` / lead metadata | Usually `address_match` |

Vendor / public capture already enrich lead metadata via `resolveAddress` → `enrichLeadAddressMetadata`. Appraisal (`createPropertyFromLead`) carries lead Cotality fields and re-resolves on create.

**Never invent AVM values.** Address Match only until IntelliVal is wired.

---

## Sandbox vs UAT / prod capability matrix

Honest limits from Cotality portal notes (do **not** fake responses):

| API / product | Sandbox | Paid UAT / Production |
|---------------|---------|------------------------|
| OAuth (client credentials) | Yes | Yes (different hosts / clients) |
| Address Match | Yes | Yes |
| Search (geo / locality / OTM) | Yes (eval dataset) | Yes |
| AVM (IntelliVal) | Yes (sandbox dataset) | Yes |
| Market Insights / Statistics | Yes (eval) | Yes |
| Schools + Content disclaimers | Yes | Yes — display disclaimer required |
| Reports (profile / PDF) | **Partial** — not all options in sandbox | Yes |
| Property Monitor (watchlists) | **No** | Yes |
| Update Data (attribute corrections) | **No** | Yes |
| Enterprise enriched attributes | Docs only — not live-testable yet | When enabled |

Sandbox tokens do **not** work against prod/UAT hosts.

---

## Recommended address format

```
[unitNumber] / [streetNumber] [streetName] [streetType] [suburb] [stateCode] [postcode]
```

Example: `1A/10 Smith St Smithville QLD 4000`

---

## Deferred next steps

1. **AVM** — after Address Match returns `propertyId`, call IntelliVal (`/au/properties/{id}/avm/...` or liveavm). Map into Property / Insights objects; never invent valuations.
2. **Market Insights** — Statistics / census by locality id once Search/Suggest resolves geography ids.
3. **Search + Suggest** — typeahead for listing create / lead capture.
4. **Schools** — Content API disclaimer + schools endpoints.
5. **Reports / Property Monitor** — only after paid UAT; keep sandbox honest (503 / not available).
6. **Per-org credentials** — today platform-level OAuth client; org store later if Cotality issues per-tenant clients.

PropTrack remains on hold (no inventing). This connector is real Cotality sandbox only.

---

## Smoke checklist (needs `CORELOGIC_CLIENT_SECRET`)

1. Set `CORELOGIC_CLIENT_ID` + `CORELOGIC_CLIENT_SECRET` in `.env.local` (secret never in git).
2. `GET /api/v1/connectors/corelogic/status` → `tokenOk: true`.
3. `POST /api/v1/connectors/corelogic/address-match` with a public AU sample address → `propertyId` or honest non-match.
4. `POST /api/v1/addresses/resolve` with same address → `metadata.corelogic_property_id` when matched.
5. Create an RE property (UI or `POST /api/v1/properties`) with that address → property has `externalRefs.corelogic_property_id` + `metadata.corelogic_property_id`.
6. Open property detail → Cotality panel shows matched id; if unmatched, use **Match with Cotality** (`PATCH` `{ action: "match_cotality" }`).
7. Optional prospecting: vendor lead with resolved address shows Cotality id; Start appraisal carries it onto the property.
