import Link from "next/link";

import { CreateProspectForm } from "@/components/command/CreateProspectForm";
import { GrowthEngineNav } from "@/components/command/GrowthEngineNav";

export default function GrowthDiscoveryPage() {
  return (
    <>
      <header className="dg-page-header">
        <Link href="/command/growth-engine" className="text-sm text-blue-400 hover:underline">
          ← Growth Engine
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Business Discovery</h1>
        <p className="text-sm text-slate-400">
          Add prospect businesses — automated search and Google Business Profile integration coming in GE-2
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <GrowthEngineNav active="/command/growth-engine/discovery" />
        <div className="dg-card max-w-2xl">
          <h2 className="font-semibold text-white">Add prospect</h2>
          <p className="mt-1 text-sm text-slate-400">
            Creates a pipeline record automatically — no manual CRM entry.
          </p>
          <div className="mt-4">
            <CreateProspectForm />
          </div>
        </div>
      </main>
    </>
  );
}
