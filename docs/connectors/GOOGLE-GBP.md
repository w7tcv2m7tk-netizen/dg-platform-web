# Google Business Profile (GBP)

**Status:** OAuth live · accounts / locations / profile fields sync · reviews best-effort into Universal Review  
**Code:** `packages/platform-core/src/connectors/google/`  
**UI:** Settings → Connectors · Reputation → Sources  
**Related:** [CONNECTOR-ENGINE.md](../foundations/CONNECTOR-ENGINE.md) · [REVIEWS-AND-REFERRALS.md](../foundations/REVIEWS-AND-REFERRALS.md)

---

## Allowlisted Cloud project (lock)

Google Business Profile APIs are **allowlisted per business, one Cloud project only**. DigitalGate already has access. **Do not apply for another project.**

| Field | Value |
|-------|--------|
| Project number (Google’s letter called this Project ID) | `742705345842` |
| Associated website | https://digitalgate.com.au/ |
| Confirmed | GBP API Team — one project per business |
| Business Profile APIs | **Enabled** — Account Management, Business Information, Google My Business (reviews) |

**Use this project for:** OAuth client (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`) and the enabled Business Profile APIs. Gmail OAuth shares the same client.

**Do not:** create a second Cloud project and request GBP access again. Google will refuse it and point back here.

**Find it in Cloud Console:** search by project **number** `742705345842` (the string project id may differ). Console: [project 742705345842](https://console.cloud.google.com/?project=742705345842).

If you need help from Google, choose **General API Question** and cite this project — do not submit a new API-access application.

Code constant: `GOOGLE_GBP_ALLOWLISTED_PROJECT_NUMBER` in `packages/platform-core/src/connectors/google/project.ts`. Operator Connectors status checks that `GOOGLE_CLIENT_ID` is issued from this project.

---

## Env

| Variable | Purpose |
|----------|---------|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth app (Vercel + `.env.local`) |
| `GOOGLE_REDIRECT_URI` | Default `https://app.digitalgate.com.au/api/connectors/google/callback` |
| `GOOGLE_OAUTH_SCOPES` | Optional override — default includes `business.manage` |

Distinct from `GOOGLE_GEOCODING_API_KEY` / `GOOGLE_PLACES_API_KEY`.

Cloud Console (project `742705345842` only): **My Business Account Management API**, **My Business Business Information API**, and **Google My Business API** are already enabled. Do not enable them on a different project.

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

Default scope `https://www.googleapis.com/auth/business.manage` is sufficient for accounts, locations, and reviews **when** the Google user has manager access on the location. The allowlisted project already has the APIs enabled — remaining review failures are login role, OAuth client on the wrong project, or location path.

---

## Honest gaps

- If reviews return `PERMISSION_DENIED` / `404`, we **keep location metadata** and surface `reviewsBlockedReason` in UI — no fake review scores. Copy does **not** tell operators to enable APIs (they are already on).
- After tokens were issued on another project, **Reconnect Google** so the allowlisted client is used.
- Location `name` from Business Information (`locations/{id}`) is normalised to `accounts/{accountId}/locations/{id}` for the Reviews v4 parent path.
- Sync cache lives on `organisation.settings.connectors.google-gbp` (encrypted tokens + plaintext snapshot). Reviews capped at 200.

---

## API surface

| Route | Method | Notes |
|-------|--------|-------|
| `/api/connectors/google/connect` | GET | Start OAuth |
| `/api/connectors/google/callback` | GET | Exchange + best-effort first sync |
| `/api/v1/connectors/google/status` | GET | Config + probe + cached health/locations + allowlisted Cloud project check |
| `/api/v1/connectors/google/locations` | GET | Cached accounts/locations |
| `/api/v1/connectors/google/sync` | POST | Pull accounts, locations, reviews |
| `/api/v1/connectors/google/disconnect` | POST | Clear org tokens + snapshot |

Core helpers: `syncOrgGoogleGbp`, `getOrgGbpSyncSnapshot`, `probeOrgGoogleGbpConnection`.
