import Link from "next/link";

import { PartnerEcosystemOverview } from "@/components/command/PartnerEcosystemContent";
import { requirePlatformOperatorContext } from "@/lib/platform-operator";

export default async function PartnerEcosystemPage() {
  await requirePlatformOperatorContext();
  return (
    <>
      <header className="dg-page-header">
        <p className="dg-page-eyebrow">Partner Network</p>
        <h1 className="dg-app-page-title">Partner Ecosystem</h1>
        <p className="dg-page-description">
          DigitalGate owns the platform. Partners extend acquisition, implementation and
          optimisation — never a generic reseller free-for-all.
        </p>
      </header>
      <main className="dg-page-main">
        <PartnerEcosystemOverview />
      </main>
    </>
  );
}
