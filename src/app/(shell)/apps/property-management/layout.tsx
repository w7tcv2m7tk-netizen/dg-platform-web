import { IndustryBetaAppLayout } from "@/components/industry/IndustryBetaAppLayout";

export default function PropertyManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <IndustryBetaAppLayout appId="property-management" title="Property Management">
      {children}
    </IndustryBetaAppLayout>
  );
}
