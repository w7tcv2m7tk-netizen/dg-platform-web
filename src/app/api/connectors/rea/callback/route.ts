import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * REA OAuth callback placeholder.
 * GET /api/connectors/rea/callback
 *
 * No token exchange until partner authorize/token docs are wired.
 * Redirects to Connectors with an honest error flash.
 */
export async function GET(req: Request) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://app.digitalgate.com.au";
  const url = new URL("/dashboard/settings/connectors", base);
  url.searchParams.set("rea", "error");
  url.searchParams.set(
    "message",
    "REA OAuth callback is scaffolded but token exchange is not implemented — partner API access required",
  );
  // Preserve any provider error for debugging without claiming success.
  const incoming = new URL(req.url);
  const providerError = incoming.searchParams.get("error");
  if (providerError) {
    url.searchParams.set("message", `REA OAuth error: ${providerError}`);
  }
  return NextResponse.redirect(url);
}
