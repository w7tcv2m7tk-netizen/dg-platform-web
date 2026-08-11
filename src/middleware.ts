import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { AUTH_AFTER_SIGN_IN_URL, AUTH_SIGN_IN_URL } from "@/lib/auth-routes";
import {
  CLERK_PROXY_PATH,
  inAppSignInUrl,
  isOffAppClerkNavigationUrl,
  shouldEnableClerkFrontendApiProxy,
} from "@/lib/clerk-proxy";

const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/signup(.*)",
  "/r/(.*)",
  "/opportunity/(.*)",
  "/sites/(.*)",
  "/wantd",
  "/wantd/(.*)",
  "/marketing/preview/(.*)",
  "/api/health(.*)",
  "/api/onboarding(.*)",
  "/api/v1/platform",
  "/api/v1/addresses/resolve",
  "/api/v1/websites/public/(.*)",
  "/api/v1/wantd/(.*)",
  "/api/webhooks/stripe",
  "/api/webhooks/dreamscape",
  "/api/webhooks/dg-onboarding-sync",
  "/api/webhooks/dg-discovery",
  "/commerce/checkout/(.*)",
  "/api/webhooks/clerk(.*)",
  // OAuth provider returns here without a guaranteed Clerk session cookie —
  // must stay public or protect() → login → /dashboard drops the auth code.
  "/api/connectors/google/callback(.*)",
  "/api/connectors/domain/callback(.*)",
  "/api/connectors/rea/callback(.*)",
]);

const PLATFORM_HOSTS = new Set(
  [
    "localhost",
    "127.0.0.1",
    "app.digitalgate.com.au",
    "dg-platform-web.vercel.app",
    process.env.NEXT_PUBLIC_APP_HOST?.trim().toLowerCase(),
    (() => {
      try {
        const u = process.env.NEXT_PUBLIC_APP_URL?.trim();
        return u ? new URL(u).hostname.toLowerCase() : "";
      } catch {
        return "";
      }
    })(),
    (() => {
      try {
        const u = process.env.VERCEL_URL?.trim();
        return u ? u.replace(/^https?:\/\//, "").split("/")[0].toLowerCase() : "";
      } catch {
        return "";
      }
    })(),
  ].filter(Boolean) as string[],
);

function isPlatformHost(hostname: string): boolean {
  const host = hostname.toLowerCase().split(":")[0];
  if (PLATFORM_HOSTS.has(host)) return true;
  if (host.endsWith(".vercel.app")) return true;
  if (host.endsWith(".localhost")) return true;
  return false;
}
const isAuthEntryRoute = createRouteMatcher(["/login(.*)", "/signup/account(.*)"]);

const isApiV1Route = createRouteMatcher(["/api/v1/(.*)"]);

function hasPlatformApiKey(req: Request) {
  const header = req.headers.get("X-API-Key")?.trim();
  if (header) return true;
  const auth = req.headers.get("Authorization")?.trim();
  return Boolean(auth?.toLowerCase().startsWith("bearer "));
}

const authorizedParties = [
  "https://app.digitalgate.com.au",
  "https://dg-platform-web.vercel.app",
  "http://localhost:3000",
  process.env.NEXT_PUBLIC_APP_URL,
].filter((url): url is string => Boolean(url));

const clerkHandler = clerkMiddleware(
  async (auth, req) => {
    if (isApiV1Route(req) && hasPlatformApiKey(req)) {
      return;
    }

    const authState = await auth();

    if (authState.userId && isAuthEntryRoute(req)) {
      return NextResponse.redirect(new URL(AUTH_AFTER_SIGN_IN_URL, req.url));
    }

    if (!isPublicRoute(req)) {
      await auth.protect();
    }
  },
  {
    authorizedParties,
    signInUrl: AUTH_SIGN_IN_URL,
    /**
     * Proxy Clerk FAPI through the app origin so session handshake stays inside
     * the installed PWA window. Only when NEXT_PUBLIC_CLERK_PROXY_URL is set
     * (Dashboard proxy must already be validated — otherwise SignIn breaks).
     */
    frontendApiProxy: {
      enabled: (url) => shouldEnableClerkFrontendApiProxy(url),
      path: CLERK_PROXY_PATH,
    },
  },
);

/**
 * Keep auth navigations on the app origin when Clerk would otherwise send the
 * browser to clerk.* / Account Portal (leaves installed PWA scope).
 */
function keepAuthOnAppOrigin(req: NextRequest, response: Response): Response {
  if (response.status < 300 || response.status >= 400) return response;

  const location = response.headers.get("location");
  if (!location) return response;

  if (!isOffAppClerkNavigationUrl(location, req.url)) return response;

  const loginUrl = inAppSignInUrl(req.url);
  const rewrite = NextResponse.redirect(loginUrl, response.status);

  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "location") return;
    // Avoid duplicating set-cookie issues; copy non-location headers for session cleanup.
    if (key.toLowerCase() === "set-cookie") {
      rewrite.headers.append(key, value);
      return;
    }
    rewrite.headers.set(key, value);
  });

  return rewrite;
}

export default async function middleware(req: NextRequest, event: unknown) {
  const hostname = req.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";

  // Custom domain → public site renderer (multi-tenant host header)
  if (hostname && !isPlatformHost(hostname)) {
    const path = req.nextUrl.pathname;
    if (
      !path.startsWith("/api") &&
      !path.startsWith("/_next") &&
      !path.startsWith("/__clerk") &&
      !path.startsWith("/sites/")
    ) {
      const url = req.nextUrl.clone();
      const pageSlug =
        path === "/" ? "" : path.replace(/^\//, "").split("/")[0] || "";
      url.pathname = "/sites/by-host";
      if (pageSlug) url.searchParams.set("page", pageSlug);
      const rewrite = NextResponse.rewrite(url);
      rewrite.headers.set("x-dg-custom-host", hostname);
      return rewrite;
    }
  }

  const response = await clerkHandler(req, event as never);
  if (!response) return response;
  return keepAuthOnAppOrigin(req, response);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    // Clerk FAPI proxy — must be a static string for Next matcher parsing
    "/__clerk/(.*)",
  ],
};
