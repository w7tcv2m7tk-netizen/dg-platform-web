import { IndustryBetaAppLayout } from "@/components/industry/IndustryBetaAppLayout";

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <IndustryBetaAppLayout appId="services" title="Services">
      {children}
    </IndustryBetaAppLayout>
  );
}
