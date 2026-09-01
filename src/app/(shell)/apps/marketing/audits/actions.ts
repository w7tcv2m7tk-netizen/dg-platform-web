"use server";

import { revalidatePath } from "next/cache";
import { runOrgSeoAudit } from "@dg/platform-core";

import { getPlatformPageContext } from "@/lib/org-apps";
import { tenantWriteEntitlementBlock } from "@/lib/write-entitlement";

export async function runMarketingSeoAuditAction() {
  const { session } = await getPlatformPageContext();
  if (!session) {
    return { error: "Platform session unavailable" };
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
    });
    revalidatePath("/apps/marketing/audits");
    return { data };
  } catch {
    return { error: "SEO audit failed" };
  }
}
