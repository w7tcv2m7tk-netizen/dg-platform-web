import { redirect } from "next/navigation";
import { canAccessCommandCentre } from "@dg/platform-core";

import { PlatformShellLoader } from "@/components/PlatformShellLoader";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function CommandLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session } = await getPlatformPageContext();

  const allowed =
    session &&
    canAccessCommandCentre({
      organisationId: session.organisationId,
      organisationName: session.organisationName,
      organisationSlug: session.organisationSlug,
      role: session.role,
    });

  if (!allowed) {
    redirect("/dashboard");
  }

  return <PlatformShellLoader showFloatingChat={false}>{children}</PlatformShellLoader>;
}
