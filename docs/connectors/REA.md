# realestate.com.au (REA Group) connector

**Status:** REA Partner — **verified** ✅ · agency activation **next** · publishing integration **in progress** · **not** live publish yet  
**Parent:** [PROPERTY-SYNDICATION.md](../foundations/PROPERTY-SYNDICATION.md) · [CONNECTOR-ENGINE.md](../foundations/CONNECTOR-ENGINE.md)  
**Manifest:** `rea` in Connector Engine planned manifests (`priorityTier` 1 / DigitalGate 15 rank 8)

**Architecture path:** DigitalGate Platform → Real Estate App → REA Connector → realestate.com.au

> **Security:** Partner API credentials (`REA_CLIENT_ID`, `REA_CLIENT_SECRET`, tokens) live in **Vercel / server-side env only** — never in git, marketing, or client bundles. Rotate in REA partner console + Vercel if exposed.

---

## How REA differs from Domain

| | **Domain** | **REA** |
|---|------------|---------|
| Developer access | Public [developer.domain.com.au](https://developer.domain.com.au) | **Verified REA Partner** — API credentials issued; agency activation next |
| First publish path | Listings Management REST (`PUT …/listings/residential`) + sandbox prefix | Partner docs + Listing Hub API and/or REAXML feed — **integration in progress** |
| OAuth | Documented authorize + token URLs; Authorization Code for agency context | Authorize/token URLs from partner package — wire after agency activation |
| Honest MVP today | Org connect + queued upsert (`pending`, not “live”) | Partner verified; Connect/Publish remain **disabled until smoke** — never fake “published” |
| Env prefix | `DOMAIN_*` | `REA_*` |

Same product shape: DigitalGate Property (Listing SoT) → syndication adapter → portal. UI panels sit side-by-side on Property detail.

---

## Env vars (Vercel / `.env.local`)

| Env | Purpose |
|-----|---------|
| `REA_CLIENT_ID` | Partner OAuth client id — **Vercel / server env only, never commit** |
| `REA_CLIENT_SECRET` | Client secret — **Vercel / server env only, never commit** |
| `REA_REDIRECT_URI` | Default `https://app.digitalgate.com.au/api/connectors/rea/callback` |
| `REA_API_BASE_URL` | Partner API host (TBD) |
| `REA_AUTH_AUTHORIZE_URL` | Authorize URL from partner docs (required before Connect) |
| `REA_AUTH_TOKEN_URL` | Token URL from partner docs (required before Connect) |
| `REA_OAUTH_SCOPES` | Optional space-separated scopes when documented |

Without `REA_CLIENT_ID` + `REA_CLIENT_SECRET`, status reports **not configured**.  
With credentials but without authorize/token URLs, status reports **endpoints unknown**.  
Listing upsert remains **not implemented** until smoke against the real API succeeds.

---

## Routes (scaffolded)

| Route | Behaviour today |
|-------|-----------------|
| `GET /api/v1/connectors/rea/status` | Honest platform + org status (`publishImplemented: false`) |
| `POST /api/v1/connectors/rea/disconnect` | Clears org token blob |
| `GET /api/connectors/rea/connect` | **503** JSON — no fake redirect |
| `GET /api/connectors/rea/callback` | Redirects to Connectors with error flash |
| `POST /api/v1/properties/[id]/syndicate/rea` | Fail closed (`not_configured` / `not_connected` / `not_implemented`) |

UI:

- Settings → Connectors → **realestate.com.au (REA)** card  
- Property detail → **REA syndication** panel (Publish disabled)

---

## Code map

```
packages/platform-core/src/connectors/rea/
  auth.ts              # Config, token storage, probes (no live OAuth yet)
  publish-property.ts  # Fail-closed publish
  index.ts

packages/platform-core/src/real-estate/syndication/
  rea-adapter.ts       # SyndicationChannelAdapter
  index.ts             # ensureReaSyndicationRegistered()

src/app/api/v1/connectors/rea/status|disconnect/
src/app/api/connectors/rea/connect|callback/
src/app/api/v1/properties/[id]/syndicate/rea/
src/components/settings/ReaConnectorPanel.tsx
src/components/re/ReaSyndicationPanel.tsx
```

Placement key (when upsert lands): `property.externalRefs.rea` — mirror Domain’s `externalRefs.domain`. Placement status must stay `pending` / `error` until REA confirms live; **never** set `published` on accept-without-confirmation.

---

## Next steps (partner verified — Aug 2026)

1. ~~Receive partner API access~~ — **done** (verified REA Partner; credentials in Vercel env only).  
2. **Agency activation** — register redirect URI, bind Roe (then founding agencies) per REA partner onboarding.  
3. Receive partner docs: authorize URL, token URL, API base, listing create/update/withdraw schemas, agency binding, webhooks if any.  
4. Set / confirm Vercel `REA_*` env (including authorize/token URLs) — **no values in git**.  
5. Implement `buildReaAuthorizeUrl` + token exchange (copy Domain connect/callback pattern).  
6. Enable Connect button; store encrypted org tokens via existing `saveOrgReaConnectorTokens`.  
7. Implement listing upsert in `publish-property.ts` (or feed upload if REAXML is the mandated path).  
8. Flip status `publishImplemented: true` only after Roe uploader activation + listings flowing (real job/id from REA).  
9. Wire withdraw + status/webhooks; keep Listing Hub UI unchanged.

**Public / marketing honesty:** say **Realestate.com.au integration — Partner-enabled** or **REA integration in progress** — not “live REA publishing” until step 8.

### Ben portal smoke (after agency activation)

1. Confirm partner package + redirect URI registered for target agency.  
2. Confirm env on Vercel / `.env.local` (placeholders only in docs).  
3. Settings → Connectors → REA → Connect (when enabled).  
4. Property with suburb/state/postcode → REA syndication → Publish.  
5. Expect **pending** (or explicit error) until live flow confirmed — not a fake “Published on REA”.

Until live publish: Settings → Connectors and Property → REA syndication should show honest **in progress / not live** copy.

---

## Related

- [PROPERTY-SYNDICATION.md](../foundations/PROPERTY-SYNDICATION.md) — Listing Hub + Domain MVP  
- [CONNECTOR-PRIORITY.md](../foundations/CONNECTOR-PRIORITY.md) — DigitalGate 15 (REA = 8)  
- Domain parallel: `packages/platform-core/src/connectors/domain/`
