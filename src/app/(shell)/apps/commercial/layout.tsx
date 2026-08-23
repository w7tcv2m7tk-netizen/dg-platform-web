import { IndustryBetaAppLayout } from "@/components/industry/IndustryBetaAppLayout";

export default function CommercialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <IndustryBetaAppLayout appId="commercial" title="Commercial Property">
      {children}
    </IndustryBetaAppLayout>
  );
}
