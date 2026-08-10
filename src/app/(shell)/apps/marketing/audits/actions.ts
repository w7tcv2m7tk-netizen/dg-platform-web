"use server";

import { revalidatePath } from "next/cache";
import { runOrgSeoAudit } from "@dg/platform-core";

import { getPlatformPageContext } from "@/lib/org-apps";

export async function runMarketingSeoAuditAction() {
  const { session } = await getPlatformPageContext();
  if (!session) {
    return { error: "Platform session unavailable" };
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
