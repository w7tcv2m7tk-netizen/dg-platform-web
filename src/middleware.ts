import { clerkFrontendApiProxy, clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { AUTH_AFTER_SIGN_IN_URL, AUTH_SIGN_IN_URL } from "@/lib/auth-routes";
import { OAUTH_RETURN_COOKIE, isDashboardOverviewPath, sanitizeOAuthReturnDestination } from "@/lib/oauth-return-path";
import { CLERK_PROXY_PATH, clerkFrontendApiOrigin, inAppSignInUrl, isClerkProxyPath, isOffAppClerkNavigationUrl, shouldEnableClerkFrontendApiProxy } from "@/lib/clerk-proxy";
import { PUBLIC_ROUTE_PATTERNS } from "@/lib/public-routes";
import { applyPublicLegacyResponse, canonicalPublicHostRedirect } from "@/lib/public-site-legacy";
import { isAetherraPublicHost } from "@/lib/aetherra-legacy-urls";
import { isDgPublicHost } from "@/lib/dg-legacy-urls";
import { isRoePublicHost } from "@/lib/roe-legacy-urls";

const isPublicRoute = createRouteMatcher(PUBLIC_ROUTE_PATTERNS);
const isExternalOAuthCallback = createRouteMatcher([
  "/api/connectors/google/callback(.*)",
  "/api/connectors/linkedin/callback(.*)",
]);

const PLATFORM_HOSTS = new Set([
  "localhost", "127.0.0.1", "app.digitalgate.com.au", "dg-platform-web.vercel.app",
  process.env.NEXT_PUBLIC_APP_HOST?.trim().toLowerCase(),
  (() => { try { const u = process.env.NEXT_PUBLIC_APP_URL?.trim(); return u ? new URL(u).hostname.toLowerCase() : ""; } catch { return ""; } })(),
  (() => { try { const u = process.env.VERCEL_URL?.trim(); return u ? u.replace(/^https?:\/\//, "").split("/")[0].toLowerCase() : ""; } catch { return ""; } })(),
].filter(Boolean) as string[]);

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
const authorizedParties = ["https://app.digitalgate.com.au", "https://dg-platform-web.vercel.app", "http://localhost:3000", process.env.NEXT_PUBLIC_APP_URL].filter((url): url is string => Boolean(url));
const clerkHandler = clerkMiddleware(async (auth, req) => {
  if (isApiV1Route(req) && hasPlatformApiKey(req)) return;
  const authState = await auth();
  if (authState.userId && isAuthEntryRoute(req)) {
    const redirectParam = req.nextUrl.searchParams.get("redirect_url") ?? req.nextUrl.searchParams.get("next");
    const destination = redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//") && !redirectParam.startsWith("/login") ? redirectParam : AUTH_AFTER_SIGN_IN_URL;
    return NextResponse.redirect(new URL(destination, req.url));
  }
  if (!isPublicRoute(req)) await auth.protect();
}, { authorizedParties, signInUrl: AUTH_SIGN_IN_URL });

function keepAuthOnAppOrigin(req: NextRequest, response: Response): Response {
  if (response.status < 300 || response.status >= 400) return response;
  const location = response.headers.get("location");
  if (!location || !isOffAppClerkNavigationUrl(location, req.url)) return response;
  const rewrite = NextResponse.redirect(inAppSignInUrl(req.url), response.status);
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "location") return;
    if (key.toLowerCase() === "set-cookie") { rewrite.headers.append(key, value); return; }
    rewrite.headers.set(key, value);
  });
  return rewrite;
}

const BRAND_TO_FUNNEL_REDIRECTS: Array<{ hostRe: RegExp; pathRe: RegExp; destination: string }> = [
  { hostRe: /^(www\.)?digitalgate\.com\.au$/i, pathRe: /^\/business-audit\/?$/i, destination: "https://audit.digitalgate.com.au/" },
  { hostRe: /^(www\.)?digitalgate\.com\.au$/i, pathRe: /^\/free-agency-audit\/?$/i, destination: "https://audit.digitalgate.com.au/" },
  { hostRe: /^(www\.)?roerealty\.com\.au$/i, pathRe: /^\/property-report\/?$/i, destination: "https://report.roerealty.com.au/" },
  { hostRe: /^(www\.)?currumbinvalleyhideaway\.com\.au$/i, pathRe: /^\/hideaway-circle\/?$/i, destination: "https://circle.currumbinvalleyhideaway.com.au/" },
];

export default async function middleware(req: NextRequest, event: unknown) {
  const hostname = req.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  const path = req.nextUrl.pathname;
  if (path === "/favicon.ico") {
    const url = req.nextUrl.clone(); url.pathname = "/icon";
    const rewrite = NextResponse.rewrite(url);
    if (hostname && !isPlatformHost(hostname)) rewrite.headers.set("x-dg-custom-host", hostname);
    return rewrite;
  }
  if (shouldEnableClerkFrontendApiProxy(req.nextUrl) && isClerkProxyPath(req.nextUrl.pathname)) return clerkFrontendApiProxy(req, { proxyPath: CLERK_PROXY_PATH, fapiUrl: clerkFrontendApiOrigin() });

  // External providers return one-time authorisation codes with signed state that
  // each callback route verifies itself. Do not let a stale/rotating Clerk browser
  // session intercept that callback before the route can exchange the code.
  if (isExternalOAuthCallback(req)) return NextResponse.next();

  if (hostname.endsWith(".vercel.app")) {
    const response = await clerkHandler(req, event as never);
    const out = response ?? NextResponse.next();
    out.headers.set("X-Robots-Tag", "noindex, nofollow");
    return keepAuthOnAppOrigin(req, out);
  }
  if (hostname && !isPlatformHost(hostname)) {
    const legacy = applyPublicLegacyResponse(req, hostname); if (legacy) return legacy;
    if ((isDgPublicHost(hostname) || isRoePublicHost(hostname) || isAetherraPublicHost(hostname)) && path.length > 1 && path.endsWith("/")) {
      const dest = req.nextUrl.clone(); dest.pathname = path.replace(/\/+$/, "") || "/"; dest.protocol = "https:"; if (hostname.startsWith("www.")) dest.hostname = hostname.replace(/^www\./, ""); return NextResponse.redirect(dest, 308);
    }
    const canonical = canonicalPublicHostRedirect(req, hostname); if (canonical) return canonical;
    for (const rule of BRAND_TO_FUNNEL_REDIRECTS) { if (rule.hostRe.test(hostname) && rule.pathRe.test(path)) { const dest = new URL(rule.destination); if (req.nextUrl.search) dest.search = req.nextUrl.search; return NextResponse.redirect(dest, 308); } }
    if (path === "/robots.txt") { const url = req.nextUrl.clone(); url.pathname = "/sites/seo/robots"; const rewrite = NextResponse.rewrite(url); rewrite.headers.set("x-dg-custom-host", hostname); return rewrite; }
    if (path === "/sitemap.xml") { const url = req.nextUrl.clone(); url.pathname = "/sites/seo/sitemap"; const rewrite = NextResponse.rewrite(url); rewrite.headers.set("x-dg-custom-host", hostname); return rewrite; }
    const indexNowKey = process.env.INDEXNOW_KEY?.trim();
    if (indexNowKey && isDgPublicHost(hostname) && path === `/${indexNowKey}.txt`) return new NextResponse(`${indexNowKey}\n`, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
    if (path === "/apple-icon" || path.startsWith("/apple-icon/") || path === "/icon" || path.startsWith("/icon/") || path === "/manifest.webmanifest") { const passthrough = NextResponse.next(); passthrough.headers.set("x-dg-custom-host", hostname); return passthrough; }
    if (!path.startsWith("/api") && !path.startsWith("/_next") && !path.startsWith("/__clerk") && !path.startsWith("/sites/")) {
      const url = req.nextUrl.clone(); const pageSlug = path === "/" ? "" : path.replace(/^\/+|\/+$/g, "") || ""; url.pathname = "/sites/by-host"; if (pageSlug) url.searchParams.set("page", pageSlug); const rewrite = NextResponse.rewrite(url); rewrite.headers.set("x-dg-custom-host", hostname); return rewrite;
    }
  }
  const response = await clerkHandler(req, event as never);
  const out = response ?? NextResponse.next();
  return recoverOAuthReturnFromOverview(req, keepAuthOnAppOrigin(req, out));
}

function recoverOAuthReturnFromOverview(req: NextRequest, response: Response): Response {
  if (req.method !== "GET" || !isDashboardOverviewPath(req.nextUrl.pathname)) return response;
  const dest = sanitizeOAuthReturnDestination(req.cookies.get(OAUTH_RETURN_COOKIE)?.value);
  if (!dest) return response;
  const redirect = NextResponse.redirect(new URL(dest, req.url));
  redirect.cookies.set(OAUTH_RETURN_COOKIE, "", { path: "/", maxAge: 0 });
  return redirect;
}

export const config = { matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/favicon.ico", "/(api|trpc)(.*)", "/__clerk/(.*)", "/wp-content/:path*", "/wp-includes/:path*", "/edd-api/:path*", "/cgi-bin/:path*"] };
