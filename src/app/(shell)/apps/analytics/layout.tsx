import { PurchasedPremiumAppLayout } from "@/components/industry/PurchasedPremiumAppLayout";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <PurchasedPremiumAppLayout appId="analytics" title="Analytics">{children}</PurchasedPremiumAppLayout>;
}
