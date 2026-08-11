# Google Business Profile (GBP)

**Status:** OAuth live · accounts / locations / profile fields sync · reviews best-effort into Universal Review  
**Code:** `packages/platform-core/src/connectors/google/`  
**UI:** Settings → Connectors · Reputation → Sources  
**Related:** [CONNECTOR-ENGINE.md](../foundations/CONNECTOR-ENGINE.md) · [REVIEWS-AND-REFERRALS.md](../foundations/REVIEWS-AND-REFERRALS.md)

---

## Env

| Variable | Purpose |
|----------|---------|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth app (Vercel + `.env.local`) |
| `GOOGLE_REDIRECT_URI` | Default `https://app.digitalgate.com.au/api/connectors/google/callback` |
| `GOOGLE_OAUTH_SCOPES` | Optional override — default includes `business.manage` |

Distinct from `GOOGLE_GEOCODING_API_KEY` / `GOOGLE_PLACES_API_KEY`.

Cloud Console: enable **My Business Account Management API**, **My Business Business Information API**, and (for reviews) **Google My Business API**.

---

## Capabilities

| Capability | Status |
|------------|--------|
| OAuth connect / disconnect / token refresh | Shipped |
| List GBP accounts | Shipped (`Account Management`) |
| List locations + basic profile fields | Shipped (`Business Information` + `readMask`) |
| Connection health + last sync on org connector blob | Shipped |
| Cache reviews → Reputation Universal Review feed | Best-effort when v4 Reviews API succeeds |
| Reply publish / insights / posts | Not yet |

Default scope `https://www.googleapis.com/auth/business.manage` is sufficient for accounts, locations, and reviews **when** the Cloud project has the APIs enabled and the Google user has manager access on the location.

---

## Honest gaps

- If reviews return `PERMISSION_DENIED` / `404`, we **keep location metadata** and surface `reviewsBlockedReason` in UI — no fake review scores.
- Location `name` from Business Information (`locations/{id}`) is normalised to `accounts/{accountId}/locations/{id}` for the Reviews v4 parent path.
- Sync cache lives on `organisation.settings.connectors.google-gbp` (encrypted tokens + plaintext snapshot). Reviews capped at 200.

---

## API surface

| Route | Method | Notes |
|-------|--------|-------|
| `/api/connectors/google/connect` | GET | Start OAuth |
| `/api/connectors/google/callback` | GET | Exchange + best-effort first sync |
| `/api/v1/connectors/google/status` | GET | Config + probe + cached health/locations |
| `/api/v1/connectors/google/locations` | GET | Cached accounts/locations |
| `/api/v1/connectors/google/sync` | POST | Pull accounts, locations, reviews |
| `/api/v1/connectors/google/disconnect` | POST | Clear org tokens + snapshot |

Core helpers: `syncOrgGoogleGbp`, `getOrgGbpSyncSnapshot`, `probeOrgGoogleGbpConnection`.
