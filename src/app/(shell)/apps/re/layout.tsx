import { IndustryBetaAppLayout } from "@/components/industry/IndustryBetaAppLayout";

export default function ReAppLayout({ children }: { children: React.ReactNode }) {
  return <IndustryBetaAppLayout appId="real-estate" title="Real Estate">{children}</IndustryBetaAppLayout>;
}
