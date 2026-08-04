import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/signup(.*)",
  "/api/health(.*)",
  "/api/onboarding(.*)",
]);

const authorizedParties = [
  "https://app.digitalgate.com.au",
  "https://dg-platform-web.vercel.app",
  process.env.NEXT_PUBLIC_APP_URL,
].filter((url): url is string => Boolean(url));

export default clerkMiddleware(
  async (auth, req) => {
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
