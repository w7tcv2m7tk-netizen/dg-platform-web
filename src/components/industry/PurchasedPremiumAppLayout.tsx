import Link from "next/link";
import { getPlatformPageContext } from "@/lib/platform-page-context";
import { hasAuthorisedPremiumApp } from "@dg/platform-core/industry/purchase-authority";

export async function PurchasedPremiumAppLayout({
  appId,
  title,
  children,
}: {
  appId: string;
  title: string;
  children: React.ReactNode;
}) {
  const { session } = await getPlatformPageContext();
  if (session && (session.role === "dg:staff" || hasAuthorisedPremiumApp(session.premiumPurchaseKeys, appId))) {
    return children;
  }
  return <main className="dg-page-main"><div className="dg-card space-y-3">
    <p className="font-medium text-white">{title} requires an active purchase</p>
    <p className="text-sm text-slate-400">Select this app in checkout or ask an organisation owner to review the subscription.</p>
    <Link href="/dashboard/settings/billing" className="text-sm text-sky-400 hover:underline">Review billing</Link>
  </div></main>;
}
