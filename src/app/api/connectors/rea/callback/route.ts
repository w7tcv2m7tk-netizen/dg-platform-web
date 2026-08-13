import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/connectors/rea/callback
 *
 * Legacy placeholder — REA Partner Platform does not use Authorization Code.
 * Redirects to Connectors with an honest message.
 */
export async function GET(req: Request) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://app.digitalgate.com.au";
  const url = new URL("/dashboard/settings/connectors", base);
  url.searchParams.set("rea", "error");
  url.searchParams.set(
    "message",
    "REA Partner Platform uses client_credentials — there is no OAuth callback. Bind an agency id on the REA connectors card.",
  );
  const incoming = new URL(req.url);
  const providerError = incoming.searchParams.get("error");
  if (providerError) {
    url.searchParams.set("message", `REA callback error: ${providerError}`);
  }
  return NextResponse.redirect(url);
}
