"use server";

import { assertEntitlement } from "@dg/platform-core";
import { revalidatePath } from "next/cache";
import { runOrgSeoAudit } from "@dg/platform-core";

import { getPlatformPageContext } from "@/lib/org-apps";

export async function runMarketingSeoAuditAction() {
  const { session } = await getPlatformPageContext();
  if (!session) {
    return { error: "Platform session unavailable" };
  }

  // Server actions never pass through requirePlatformAuth, so the central
  // write gate in lib/entitlement-gate does not see them. This action persists
  // audit results, so it must assert the same entitlement itself.
  const gate = await assertEntitlement(session.organisationId, "write");
  if (!gate.ok) {
    return { error: gate.message };
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
