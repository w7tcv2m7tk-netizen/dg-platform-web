import { PurchasedPremiumAppLayout } from "@/components/industry/PurchasedPremiumAppLayout";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <PurchasedPremiumAppLayout appId="advertising" title="Advertising">{children}</PurchasedPremiumAppLayout>;
}
