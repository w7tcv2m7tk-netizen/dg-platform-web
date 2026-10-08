import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { sessionHasFeature } from "@dg/platform-core";
import { getPlatformPageContext } from "@/lib/platform-page-context";

/** Preview is authenticated and tenant-scoped; query flags alone never grant it. */
export async function prospectReportAccess(preview: string | undefined) {
  const { session, user } = await getPlatformPageContext();
  if (preview === "1" || preview === "true") {
    if (!session || !sessionHasFeature(session, "prospecting.prospects.read")) notFound();
    return { kind: "preview" as const, organisationId: session.organisationId };
  }
  const requestHeaders = await headers();
  const automated = /bot|crawler|spider|preview|headless/i.test(requestHeaders.get("user-agent") || "")
    || requestHeaders.has("next-router-prefetch")
    || /prefetch/i.test(requestHeaders.get("purpose") || requestHeaders.get("sec-purpose") || "");
  // Signed-in access is internal/non-counting even if someone opens the public URL.
  return { kind: "public" as const, recordView: !user && !automated };
}
