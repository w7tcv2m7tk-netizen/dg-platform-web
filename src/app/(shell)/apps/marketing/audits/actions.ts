"use server";

import { revalidatePath } from "next/cache";
import { runOrgSeoAudit, sessionHasFeature } from "@dg/platform-core";

import { getPlatformPageContext } from "@/lib/org-apps";
import { canAccessWebsiteStudio } from "@/lib/website-studio-access";
import { tenantWriteEntitlementBlock } from "@/lib/write-entitlement";

export async function runMarketingSeoAuditAction() {
  const { session } = await getPlatformPageContext();
  if (!session) {
    return { error: "Platform session unavailable" };
  }

  if (!sessionHasFeature(session, "seo.read")) {
    return { error: "Your role does not allow this action (seo.read)." };
  }

  const writeBlock = await tenantWriteEntitlementBlock(session);
  if (writeBlock) {
    return { error: writeBlock.message };
  }

  try {
    const data = await runOrgSeoAudit({
      organisationId: session.organisationId,
      actorId: session.clerkUserId,
      persist: true,
      includeNativeStudio: canAccessWebsiteStudio(session, "view"),
    });
    revalidatePath("/apps/marketing/audits");
    return { data };
  } catch {
    return { error: "SEO audit failed" };
  }
}
