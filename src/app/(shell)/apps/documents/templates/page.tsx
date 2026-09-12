import { redirect } from "next/navigation";

import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

export default async function DocumentsTemplatesPage() {
  const session = await getAuthorisedPlatformPageSession("documents.read");
  if (!session) return null;

  redirect("/apps/documents/library");
}
