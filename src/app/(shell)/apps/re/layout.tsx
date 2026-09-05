import { organisationHasReBeta } from "@dg/platform-core";

import { ReBetaGateMessage } from "@/components/re/ReBetaChecklist";
import { getPlatformPageContext } from "@/lib/platform-page-context";

/**
 * Gate all /apps/re/* routes behind the re.beta feature flag.
 */
export default async function ReAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session } = await getPlatformPageContext();

  if (!session || !process.env.DATABASE_URL) {
    return children;
  }

  const allowed = await organisationHasReBeta(session.organisationId);
  if (allowed) return children;

  return (
    <main className="dg-page-main">
      <ReBetaGateMessage />
    </main>
  );
}
