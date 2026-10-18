import { PurchasedPremiumAppLayout } from "@/components/industry/PurchasedPremiumAppLayout";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <PurchasedPremiumAppLayout appId="social" title="Social">{children}</PurchasedPremiumAppLayout>;
}
