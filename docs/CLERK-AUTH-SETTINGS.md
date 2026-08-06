# Clerk auth — dashboard settings

Code handles redirects and same-window login. These **Clerk Dashboard** settings control session length and when 2FA is required.

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

## PWA / “another window”

If the app was **Add to Home Screen**, iOS/Android open it in a separate standalone window from Safari/Chrome — cookies do not sync. Use the platform in the **browser tab** (`app.digitalgate.com.au`) or remove the home-screen shortcut and re-add after login.

The web manifest uses `display: "browser"` so installed shortcuts behave like a normal tab where possible.
