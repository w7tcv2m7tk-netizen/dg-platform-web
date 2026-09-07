import { redirect } from "next/navigation";

/**
 * Growth Engine is a tenant-scoped Prospecting capability, not a cross-tenant
 * Command Centre surface. Keep this legacy route only as a compatibility entry
 * point to the canonical organisation workspace.
 */
export default function CommandGrowthEngineRedirectPage() {
  redirect("/apps/prospecting");
}
