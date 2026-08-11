# Cotality / CoreLogic Asia (RP Data)



**Connector id:** `corelogic`  

**Category:** Property (Connector Engine)  

**Auth:** OAuth2 **client credentials** (platform-level client)  

**Portal:** [developer.corelogic.asia](https://developer.corelogic.asia)  

**Client:** DigitalGate Property Data (`digitalgate-property-data`)



DigitalGate integrates Cotality as a **Connector**, not as hard-coded Core domain logic. Address Match feeds the existing address resolve path; Property Details / AVM plug into the same client. Reports use **only fields Cotality returns** — never invent valuations, demand scores, or citations.



---



## Env (server-only)



| Variable | Required | Notes |

|----------|----------|--------|

| `CORELOGIC_CLIENT_ID` | yes | OAuth client id |

| `CORELOGIC_CLIENT_SECRET` | yes | **Never commit.** Paste into `.env.local` / Vercel only |

| `CORELOGIC_TOKEN_URL` | no | Default: `https://api-sbox.corelogic.asia/access/as/token.oauth2` |

| `CORELOGIC_API_BASE` | no | Optional override; Search defaults use this if `CORELOGIC_SEARCH_BASE` unset |

| `CORELOGIC_SEARCH_BASE` | no | Default sandbox: `https://api-sbox.corelogic.asia/search` |

| `CORELOGIC_PROPERTY_DETAILS_BASE` | no | Default: `https://api-sbox.corelogic.asia/property-details` |

| `CORELOGIC_AVM_BASE` | no | Default: `https://api-sbox.corelogic.asia/avm` |

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

| Property match action | **Live** | `PATCH /api/v1/properties/:id` `{ action: "match_cotality" }` — also pulls details by default |

| Property Details pull | **Live** | `PATCH` `{ action: "pull_cotality" }` → attributes/core, additional, site, sales/last, features + optional AVM |

| Property report | **Live** | `POST /api/v1/re/reports` `{ action: "property_report", propertyId, to? }` — markdown + optional branded email |

| Status probe | **Live** | `GET /api/v1/connectors/corelogic/status` (auth) |

| Direct match API | **Live** | `POST /api/v1/connectors/corelogic/address-match` (auth) |



Code: `packages/platform-core/src/connectors/corelogic/` + `packages/platform-core/src/properties/` + `packages/platform-core/src/real-estate/reports.ts`



### Property storage



| Field | Location | Notes |

|-------|----------|--------|

| `corelogic_property_id` | `Property.externalRefs` **and** `Property.metadata` | Canonical Cotality property id |

| `corelogic_match_type` | `Property.metadata` | E/A/P/F/… from Address Match |

| `corelogic_matched_address` | `Property.metadata` | Cotality single-line when returned |

| `corelogic_source` | `Property.metadata` / lead metadata | Usually `address_match` |

| `corelogic_details` | `Property.metadata` | Parsed Property Details snapshot (honest fields + section statuses) |

| `corelogic_details_fetched_at` | `Property.metadata` | ISO timestamp of last pull |



Empty Property listing fields (beds/baths/type/car/land/building) may be filled from Cotality when blank — existing listing values are never overwritten.



Vendor / public capture already enrich lead metadata via `resolveAddress` → `enrichLeadAddressMetadata`. Appraisal (`createPropertyFromLead`) carries lead Cotality fields and re-resolves on create.



**Never invent AVM values.** Persist Cotality “unavailable” / error messages honestly.



---



## Property Details endpoints (sandbox verified)



Base: `https://api-sbox.corelogic.asia/property-details`



| Path | Typical fields |

|------|----------------|

| `/au/properties/{id}/attributes/core` | propertyType, beds, baths, carSpaces, landArea |

| `/au/properties/{id}/attributes/additional` | floorArea, yearBuilt |

| `/au/properties/{id}/site` | landUsePrimary, zoneCodeLocal, zoneDescriptionLocal |

| `/au/properties/{id}/sales/last` | lastSale.price, contractDate, settlementDate, type |

| `/au/properties/{id}/features` | features[], featureAttributes[] |



AVM base: `https://api-sbox.corelogic.asia/avm`



| Path | Notes |

|------|--------|

| `/au/properties/{id}/avm/intellival/consumer/current` | May 404 with honest “estimate not available” for non-residential / out-of-scope |



---



## Property report flow



1. **Public request (unchanged):** Roe WP `/property-report/` → emails + CRM vendor lead (`source: property_report`) + 5-email follow-up. Dual-write can land the lead in Gen 2.

2. **Agency work (Gen 2):** Open Property → Cotality panel → Match (if needed) → Pull details → **Generate report** / **Generate & send** (org-branded email via Communications / Resend).

3. Report markdown includes Cotality attributes, last sale, features, and AVM section with honest empty copy when Cotality has no estimate. No fake buyer-demand scores.



---



## Sandbox vs UAT / prod capability matrix



Honest limits from Cotality portal notes + live sandbox probes (do **not** fake responses):



| API / product | Sandbox | Paid UAT / Production |

|---------------|---------|------------------------|

| OAuth (client credentials) | Yes | Yes (different hosts / clients) |

| Address Match | Yes | Yes |

| Property Details (attributes / site / last sale / features) | **Yes** (eval dataset) | Yes |

| Search (geo / locality / OTM) | Yes (eval dataset) | Yes |

| AVM (IntelliVal) | Yes — often unavailable for non-residential / thin data | Yes |

| Market Insights / Statistics | Yes (eval) | Yes |

| Schools + Content disclaimers | Yes | Yes — display disclaimer required |

| Cotality PDF / profile Reports API | **Partial** — not all options in sandbox | Yes |

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



Sandbox sample that matches + returns Property Details: `42 Marine Parade Coolangatta QLD 4225`



---



## Deferred next steps



1. **Comparables / Market Insights** — Property Services comparables + Statistics once locality ids are resolved.

2. **Search + Suggest** — typeahead for listing create / lead capture.

3. **Schools** — Content API disclaimer + schools endpoints.

4. **Cotality PDF Reports / Property Monitor** — only after paid UAT; Gen 2 markdown report is the interim sendable artefact.

5. **Auto-send on WP property_report lead** — optional automation once report quality is signed off.

6. **Per-org credentials** — today platform-level OAuth client; org store later if Cotality issues per-tenant clients.



PropTrack remains on hold (no inventing). This connector is real Cotality sandbox only.



---



## Smoke checklist (needs `CORELOGIC_CLIENT_SECRET`)



1. Set `CORELOGIC_CLIENT_ID` + `CORELOGIC_CLIENT_SECRET` in `.env.local` (secret never in git).

2. `GET /api/v1/connectors/corelogic/status` → `tokenOk: true`.

3. `POST /api/v1/connectors/corelogic/address-match` with `42 Marine Parade Coolangatta QLD 4225` → `propertyId`.

4. Create / open an RE property with that address → **Match with Cotality** (auto-pulls details).

5. Cotality panel shows attributes / last sale / AVM honesty note.

6. **Generate report** → markdown preview; **Generate & send** with a test email (Resend or queued Activity).

7. Optional: `PATCH /api/v1/properties/:id` `{ "action": "pull_cotality" }` to refresh.


