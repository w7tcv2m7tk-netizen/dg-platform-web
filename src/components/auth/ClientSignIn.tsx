"use client";

import { SignIn } from "@clerk/nextjs";

import { AUTH_AFTER_SIGN_IN_URL, AUTH_SIGN_UP_URL } from "@/lib/auth-routes";

/**
 * Embedded client login — email + password (and optional SSO from Dashboard).
 * Always path-routed on /login so Account Portal / clerk.* hosted pages are not used.
 */
export function ClientSignIn({ redirectUrl }: { redirectUrl?: string }) {
  const after = redirectUrl && redirectUrl.startsWith("/") ? redirectUrl : AUTH_AFTER_SIGN_IN_URL;

  return (
    <SignIn
      routing="path"
      path="/login"
      signUpUrl={AUTH_SIGN_UP_URL}
      forceRedirectUrl={after}
      fallbackRedirectUrl={after}
      oauthFlow="redirect"
      withSignUp={false}
    />
  );
}
