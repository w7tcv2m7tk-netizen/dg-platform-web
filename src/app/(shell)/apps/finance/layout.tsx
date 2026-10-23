import { IndustryBetaAppLayout } from "@/components/industry/IndustryBetaAppLayout";
import { getPlatformPageContext } from "@/lib/platform-page-context";
import { getFinanceAppAccessState } from "@/lib/finance-app-access";
import Link from "next/link";

export default async function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session } = await getPlatformPageContext();
  if (session) {
    if (!process.env.DATABASE_URL) {
      return (
        <main className="dg-page-main">
          <div className="dg-card space-y-3">
            <p className="font-medium text-white">Finance access unavailable</p>
            <p className="text-sm text-slate-400">
              Finance access could not be verified. Try again when the workspace is available.
            </p>
          </div>
        </main>
      );
    }
    let access;
    try {
      access = await getFinanceAppAccessState(session.organisationId);
    } catch {
      return (
        <main className="dg-page-main">
          <div className="dg-card space-y-3">
            <p className="font-medium text-white">Finance access unavailable</p>
            <p className="text-sm text-slate-400">
              Finance access could not be verified. Try again when the workspace is available.
            </p>
          </div>
        </main>
      );
    }
    if (access.betaEnrolled && !access.industryEntitled) {
      return (
        <main className="dg-page-main">
          <div className="dg-card space-y-3">
            <p className="font-medium text-white">Finance Industry App required</p>
            <p className="text-sm text-slate-400">
              This workspace does not have the Finance Industry App entitlement.
            </p>
            <Link
              href="/dashboard/apps"
              className="inline-flex min-h-11 items-center text-sm text-sky-400 hover:underline"
            >
              Review Industry Apps
            </Link>
          </div>
        </main>
      );
    }
  }

  return (
    <IndustryBetaAppLayout appId="finance" title="Finance">
      {children}
    </IndustryBetaAppLayout>
  );
}
