import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { AUTH_AFTER_SIGN_IN_URL } from "@/lib/auth-routes";

const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/signup(.*)",
  "/marketing/preview/(.*)",
  "/api/health(.*)",
  "/api/onboarding(.*)",
  "/api/v1/platform",
  "/api/v1/addresses/resolve",
  "/api/webhooks/stripe",
  "/commerce/checkout/(.*)",
  "/api/webhooks/clerk(.*)",
]);

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

export default clerkMiddleware(
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
  { authorizedParties },
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
