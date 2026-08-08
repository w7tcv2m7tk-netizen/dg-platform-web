# Clerk auth — dashboard settings

Code handles redirects and same-window login. These **Clerk Dashboard** settings control session length, 2FA, and (for installed PWAs) Frontend API proxying.

## Same-window login (no pop-ups)

In the app we set `oauthFlow="redirect"` on Sign In / Sign Up so OAuth and callbacks stay in the same tab.

If email verification opens a **new tab**, switch Client Trust / verification from **email link** to **email code**:

1. [Clerk Dashboard](https://dashboard.clerk.com) → **User & authentication**
2. Under **Email** / **Password** / **Client Trust**, prefer **one-time code** over **magic link** for second-factor on new devices

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

### Fix in code (shipped)

- Middleware `frontendApiProxy` on `/__clerk` for `app.digitalgate.com.au`
- `ClerkProvider` `proxyUrl` from `NEXT_PUBLIC_CLERK_PROXY_URL` (production default derived)
- Manifest stays `standalone` with same-origin `start_url`

### Ben must enable in Clerk Dashboard

1. Deploy the build that serves `/__clerk/*` first.
2. [Domains](https://dashboard.clerk.com/~/domains) → **Frontend API** → **Set proxy configuration**
3. Proxy URL: **`https://app.digitalgate.com.au/__clerk`**
4. Vercel Production: set  
   `NEXT_PUBLIC_CLERK_PROXY_URL=https://app.digitalgate.com.au/__clerk`
5. Redeploy.
6. **Allowed redirect URLs / origins**: include `https://app.digitalgate.com.au` (and previews if needed).

Clerk proxy validation fails if the proxy is not live yet — enable Dashboard **after** deploy.

Proxying works on **production** Clerk instances only (not development `pk_test_` / localhost).

### Verify

1. Reinstall or Refresh the PWA (`dg-v4` update banner).
2. Sign in **inside** the installed app.
3. On next session handshake, URL should stay on `app.digitalgate.com.au/__clerk/...` inside the standalone window — no Safari/Chrome spawn.

See also [PWA.md](./PWA.md).
