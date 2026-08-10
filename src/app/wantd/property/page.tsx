import type { Metadata } from "next";

import { WantdPropertyWantForm } from "@/components/wantd/WantdPropertyWantForm";

export const metadata: Metadata = {
  title: "Tell us what property you want | Wantd",
  description:
    "Demand-first property matching — describe what you want and Wantd finds relevant supply.",
};

/** Public MVP capture surface for wantdproperty.com.au (hosted on DigitalGate until DNS cutover). */
export default function WantdPropertyWantPage() {
  return (
    <div className="min-h-screen bg-[#0B1220] text-slate-100">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(232,168,56,0.25), transparent), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(45,212,191,0.12), transparent)",
        }}
      />
      <main className="relative mx-auto max-w-xl px-4 py-12 sm:py-16">
        <p className="text-sm font-semibold tracking-[0.2em] text-amber-300/90">WANTD</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Tell us what property you want.
        </h1>
        <p className="mt-3 text-base text-slate-400">
          Buyers lead. Suppliers respond. Skip endless scrolling — describe the home, acreage, or
          investment you want and we match relevant supply.
        </p>
        <div className="mt-10 rounded-2xl border border-slate-800/80 bg-slate-950/50 p-5 sm:p-7">
          <WantdPropertyWantForm />
        </div>
        <p className="mt-8 text-center text-xs text-slate-600">
          Powered by DigitalGate ·{" "}
          <a href="https://wantdproperty.com.au" className="text-slate-500 hover:text-slate-300">
            wantdproperty.com.au
          </a>
        </p>
      </main>
    </div>
  );
}
