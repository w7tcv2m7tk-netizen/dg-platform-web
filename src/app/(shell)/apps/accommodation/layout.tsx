import { IndustryBetaAppLayout } from "@/components/industry/IndustryBetaAppLayout";

export default function AccommodationAppLayout({ children }: { children: React.ReactNode }) {
  return <IndustryBetaAppLayout appId="accommodation" title="Accommodation">{children}</IndustryBetaAppLayout>;
}
