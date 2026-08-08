"use client";

import { useEffect } from "react";

import { AUTH_SIGN_IN_URL } from "@/lib/auth-routes";

/**
 * In installed PWAs, never let Clerk / Account Portal navigate leave the app
 * origin (window.open or top-level navigation to clerk.*). Prefer /login.
 */
export function ClerkPwaNavigationGuard() {
  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      ("standalone" in navigator &&
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone));

    function isOffAppClerkHost(hostname: string) {
      const host = hostname.toLowerCase();
      return (
        host === "clerk.digitalgate.com.au" ||
        host.endsWith(".clerk.accounts.dev") ||
        host.endsWith(".accounts.dev") ||
        host === "accounts.clerk.com" ||
        host.endsWith(".clerk.com") ||
        host.endsWith(".clerk.services") ||
        host === "frontend-api.clerk.dev" ||
        host.endsWith(".clerk.dev")
      );
    }

    function toInAppLogin(returnUrl?: string) {
      const login = new URL(AUTH_SIGN_IN_URL, window.location.origin);
      if (returnUrl) {
        try {
          const ret = new URL(returnUrl, window.location.origin);
          if (ret.origin === window.location.origin) {
            login.searchParams.set("redirect_url", `${ret.pathname}${ret.search}`);
          }
        } catch {
          /* ignore */
        }
      }
      return login.toString();
    }

    const originalOpen = window.open.bind(window);
    window.open = ((url?: string | URL, target?: string, features?: string) => {
      if (url == null) return originalOpen(url, target, features);
      try {
        const parsed = new URL(String(url), window.location.origin);
        if (isOffAppClerkHost(parsed.hostname)) {
          // Never spawn an external browser for Clerk — stay in this window.
          window.location.assign(toInAppLogin(window.location.href));
          return null;
        }
      } catch {
        /* fall through */
      }
      return originalOpen(url, target, features);
    }) as typeof window.open;

    function onClickCapture(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!anchor?.href) return;

      let parsed: URL;
      try {
        parsed = new URL(anchor.href, window.location.origin);
      } catch {
        return;
      }

      if (!isOffAppClerkHost(parsed.hostname)) return;

      event.preventDefault();
      event.stopPropagation();
      window.location.assign(toInAppLogin(window.location.href));
    }

    // Standalone: also catch programmatic top-level assignments when possible via click only.
    // Full location.assign hooks are too invasive; middleware + SignIn oauthFlow cover the rest.
    document.addEventListener("click", onClickCapture, true);

    // If something already landed us on a clerk host inside a broken webview, bail to login.
    if (isStandalone && isOffAppClerkHost(window.location.hostname)) {
      window.location.replace(toInAppLogin());
    }

    return () => {
      window.open = originalOpen;
      document.removeEventListener("click", onClickCapture, true);
    };
  }, []);

  return null;
}
