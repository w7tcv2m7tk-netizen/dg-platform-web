import Link from "next/link";

import { DeliveryOperatingModel } from "@/components/command/PartnerEcosystemContent";
import { requirePlatformOperatorContext } from "@/lib/platform-operator";

export default async function PartnerDeliveryPage() {
  await requirePlatformOperatorContext();
  return (
    <>
      <header className="dg-page-header">
        <p className="dg-page-eyebrow">Partner Network</p>
        <h1 className="dg-app-page-title">Delivery Partners</h1>
        <p className="dg-page-description">
          Partner type and operating model — who implements and how they earn. Live
          implementation work lives under Delivery.
        </p>
        <Link
          href="/command/delivery"
          className="mt-4 inline-flex text-sm font-medium text-sky-300 hover:text-sky-200"
        >
          Open Delivery ops →
        </Link>
      </header>
      <main className="dg-page-main">
        <DeliveryOperatingModel />
      </main>
    </>
  );
}
