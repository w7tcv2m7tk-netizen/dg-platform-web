import {
  bootConnectorEngine,
  reaCredentialsConfigured,
} from "@dg/platform-core";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

bootConnectorEngine();

/**
 * GET /api/connectors/rea/connect
 *
 * REA Partner Platform uses client_credentials (no user OAuth redirect).
 * Redirect to Connectors with an honest flash so operators bind an agency id.
 */
export async function GET() {
  const { userId } = await auth();
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://app.digitalgate.com.au";

  if (!userId) {
    return NextResponse.redirect(new URL("/login", base));
  }

  const url = new URL("/dashboard/settings/connectors", base);

  if (!reaCredentialsConfigured()) {
    url.searchParams.set("rea", "error");
    url.searchParams.set(
      "message",
      "REA_CLIENT_ID / REA_CLIENT_SECRET missing — set Partner Platform credentials on Vercel",
    );
    return NextResponse.redirect(url);
  }

  url.searchParams.set("rea", "error");
  url.searchParams.set(
    "message",
    "REA uses Partner Platform client_credentials (no Connect redirect). Activate an agency id on the REA card after Ignite / Change of Uploader.",
  );
  return NextResponse.redirect(url);
}
