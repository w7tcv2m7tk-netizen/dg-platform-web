import Link from "next/link";

import { DeliveryOperatingModel } from "@/components/command/PartnerEcosystemContent";

export default function PartnerDeliveryPage() {
  return (
    <>
      <header className="dg-page-header">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">Partners</p>
        <h1 className="mt-1 text-2xl font-bold text-white">Delivery Partners</h1>
        <p className="mt-1 text-sm text-slate-400">
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
