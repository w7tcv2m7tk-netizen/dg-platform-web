import "server-only";
import { buildAccessContext, hasPermission } from "@dg/platform-core/access";
import { getPlatformPageContext } from "@/lib/platform-page-context";
import { briefingEnabled } from "./contract";
import { retrieveBriefing } from "./retrieval";

/** No shared cache, generation, provider calls or database writes in phase 1. */
export async function getBusinessBriefing() {
  const enabled = briefingEnabled(process.env.AIDA_BUSINESS_BRIEFING_ENABLED);
  if (!enabled) return { status: "disabled" } as const;
  const { session } = await getPlatformPageContext();
  const canView = session ? hasPermission(buildAccessContext({
    role: session.role, organisationId: session.organisationId,
    principalId: session.clerkUserId, grants: session.permissionGrants, enabledAppIds: [],
  }), { module: "intelligence", action: "view", scope: "organisation" }) : false;
  // Current Business Profile is one per organisation. Do not invent a separate business selector.
  const authorisedScope = session ? { organisationId: session.organisationId, businessId: session.organisationId } : null;
  return retrieveBriefing({ enabled, authorisedScope, canView,
    // No approved daily intelligence repository exists yet. Never synthesise live news.
    read: async () => null,
  });
}
