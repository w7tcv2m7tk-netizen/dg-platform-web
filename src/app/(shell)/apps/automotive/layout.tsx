import { IndustryBetaAppLayout } from "@/components/industry/IndustryBetaAppLayout";

export default function AutomotiveLayout({ children }: { children: React.ReactNode }) {
  return <IndustryBetaAppLayout appId="automotive" title="Automotive">{children}</IndustryBetaAppLayout>;
}
