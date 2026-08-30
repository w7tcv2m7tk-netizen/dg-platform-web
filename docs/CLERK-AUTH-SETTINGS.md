# Clerk auth — dashboard settings

Code handles redirects and same-window login. These **Clerk Dashboard** settings control session length, 2FA, and (for installed PWAs) Frontend API proxying.

## Same-window login (no pop-ups)

In the app we set `oauthFlow="redirect"` on Sign In / Sign Up so OAuth and callbacks stay in the same tab. A PWA navigation guard also blocks `window.open` / anchor clicks to `clerk.*` and sends users to in-app `/login` instead.

If email verification opens a **new tab**, switch Client Trust / verification from **email link** to **email code**:

1. [Clerk Dashboard](https://dashboard.clerk.com) → **User & authentication**
2. Under **Email** / **Password** / **Client Trust**, prefer **one-time code** over **magic link** for second-factor on new devices

## Email + password (client login)

App sign-in is the **embedded** `<SignIn />` on **`https://app.digitalgate.com.au/login`** (not Account Portal on `clerk.*`).

Dashboard:

1. **User & authentication → Email** — enabled  
2. **User & authentication → Password** — enabled (required for client email/password)  
3. Optional SSO is fine; social buttons are hidden in the app until re-enabled in CSS  
4. **Avoid** making Account Portal / Hosted Pages the default sign-in destination for this app  

Vercel / Clerk path env (must match app routes — **`/login`**, not `/sign-in`):

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/login` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/signup/account` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_OUT_URL` | `/login` |

If SignIn shows **no email/password fields**, the usual cause is a **broken FAPI proxy** (`host_invalid` on `/__clerk/v1/environment`). See PWA section — remove or fix `CLERK_PROXY_URL` until Dashboard proxy validates.

## Stay signed in (manual sign-out only)

1. **Configure → Sessions**
   - **Session lifetime**: e.g. **7 days** or **30 days** (not 1 hour)
   - **Inactivity timeout**: **Off** or match session lifetime
   - **Multi-session handling**: allow multiple devices if you use phone + desktop

2. The app calls Clerk’s session **touch** on focus (`touchSession` default) so active use keeps the session alive.

Clearing browser cache/cookies will always sign you out — that is expected.

## 2FA only on new browsers / devices

**Client Trust** (Clerk default) asks for a second factor only when:

- Sign-in uses a **password**, and  
- The **device/browser is new** (no trust cookie)

After you verify once on that browser, you should not see 2FA again until cache is cleared or you use a different device.

If you enabled **user MFA** (authenticator app / SMS on every login), that overrides Client Trust and can prompt every sign-in. For “new device only”, use **Client Trust** without mandatory MFA for all users.

## After sign-in destination

App redirects to **`/dashboard`** (Business Platform Overview). Env vars:

- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard`
- `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard`

## PWA / installed app — keep handshake in-window

### Root cause

Manifest `display: "standalone"` + `scope: "/"` only covers `https://app.digitalgate.com.au/*`.

Session refresh that redirects to `https://clerk.digitalgate.com.au/v1/client/handshake?...` leaves PWA scope → OS opens an external browser. Reason often includes `session-token-expired-refresh-non-eligible-no-refresh-cookie` (refresh cookie missing / partitioned in standalone).

### Fix in code

- Middleware can proxy FAPI on `/__clerk` **only when** `CLERK_PROXY_URL` is set
- `ClerkProvider` `proxyUrl` from that same env (no silent production default)
- If Clerk would redirect off-origin to `clerk.*` / Account Portal, middleware rewrites to **same-window `/login`**
- Client guard: never `window.open` Clerk; click-capture sends users to `/login`
- Manifest stays `standalone` with same-origin `start_url`

### Ben config checklist (exact order)

Do **not** set the Vercel proxy env before Dashboard validates — that blanks SignIn (`host_invalid`).

1. Deploy a build that includes the `/__clerk` middleware matcher (already on `main`).
2. [Clerk Dashboard → Domains](https://dashboard.clerk.com/~/domains) → **Frontend API** → **Set proxy configuration**
3. Proxy URL: **`https://app.digitalgate.com.au/__clerk`**
4. Wait until Clerk reports the proxy as **valid** (not failed).
5. Vercel **Production** env:
   - `CLERK_PROXY_URL=https://app.digitalgate.com.au/__clerk`
   - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login`
   - `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup/account`
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard`
   - `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard`
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_OUT_URL=/login`
6. Redeploy Vercel.
7. **Allowed redirect URLs / origins**: include `https://app.digitalgate.com.au` (and previews if needed).
8. Confirm password strategy is enabled (see Email + password above).

Proxying works on **production** Clerk instances only (not `pk_test_` / localhost).

### Verify proxy health

```bash
curl -s "https://app.digitalgate.com.au/__clerk/v1/environment" | head
```

- **Good**: JSON environment payload (instance config), not `host_invalid`
- **Bad**: `{"errors":[{"code":"host_invalid",...}]}` → Dashboard proxy not enabled/validated; **unset** `CLERK_PROXY_URL` until fixed

### Verify in installed app

1. Open the installed DigitalGate app; tap **Update available → Refresh** if shown (`dg-v5`).
2. Sign out if needed, then open **Client login**, **Acquisition Partner login**, or **Delivery Partner login** — you should see **email + password**. Audience is set from the return path (`/acquisition`, `/delivery`) or `?audience=`.
3. Sign in **inside** the installed app (not only in a browser tab).
4. On next session handshake, URL should stay on `app.digitalgate.com.au/__clerk/...` (with proxy) or `/login` (without) — **never** spawn Safari/Chrome on `clerk.digitalgate.com.au`.

See also [PWA.md](./PWA.md).
