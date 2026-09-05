import { sessionHasFeature, type PlatformSession } from "@dg/platform-core";
import { notFound } from "next/navigation";

import { getPlatformPageContext } from "@/lib/platform-page-context";

/** Resolve the active native session and enforce a page-level feature before data access. */
export async function getAuthorisedPlatformPageSession(
  featureId: string,
): Promise<PlatformSession | null> {
  const { session } = await getPlatformPageContext();
  if (!session) return null;
  if (!sessionHasFeature(session, featureId)) notFound();
  return session;
}
