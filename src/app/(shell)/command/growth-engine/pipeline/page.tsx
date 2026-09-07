import { redirect } from "next/navigation";

/**
 * The prospect pipeline is a tenant-scoped Prospecting capability, not a
 * cross-tenant Command Centre surface. The canonical organisation workspace at
 * `/apps/prospecting/pipeline` owns this kanban; keep this legacy operator path
 * only as a compatibility redirect so bookmarks/links continue to work.
 */
export default function CommandGrowthPipelineRedirectPage() {
  redirect("/apps/prospecting/pipeline");
}
