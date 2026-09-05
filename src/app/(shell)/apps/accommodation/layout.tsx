import { AccBetaGateMessage } from "@/components/accommodation/AccBetaChecklist";
import { checkAccBetaAccess } from "@/lib/acc-beta-access";
import { getPlatformPageContext } from "@/lib/platform-page-context";

/**
 * Gate all /apps/accommodation/* routes behind the acc.beta feature flag.
 */
export default async function AccommodationAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session } = await getPlatformPageContext();

  if (!session || !process.env.DATABASE_URL) {
    return children;
  }

  const { allowed } = await checkAccBetaAccess(session.organisationId);
  if (allowed) return children;

  return (
    <main className="dg-page-main">
      <AccBetaGateMessage />
    </main>
  );
}
