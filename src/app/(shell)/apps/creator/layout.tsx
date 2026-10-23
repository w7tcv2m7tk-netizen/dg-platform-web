import { IndustryBetaAppLayout } from "@/components/industry/IndustryBetaAppLayout";

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
  return <IndustryBetaAppLayout appId="creator" title="Creator">{children}</IndustryBetaAppLayout>;
}
