import { IndustryBetaAppLayout } from "@/components/industry/IndustryBetaAppLayout";

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <IndustryBetaAppLayout appId="finance" title="Finance">
      {children}
    </IndustryBetaAppLayout>
  );
}
