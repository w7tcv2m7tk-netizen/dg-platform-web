import { ProspectingSubnav } from "@/components/prospecting/ProspectingSubnav";

export default function ProspectingDiscoveryPage() {
  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Discovery</h1>
        <p className="text-sm text-slate-400">
          Structured discovery of the prospect’s current situation and systems.
        </p>
        <ProspectingSubnav active="/apps/prospecting/discovery" />
      </header>
      <main className="dg-page-main">
        <div className="dg-card space-y-3">
          <p className="text-sm text-slate-300">
            Capture what they use today, primary problems, decision process and desired outcomes —
            the inputs Opportunity scoring needs.
          </p>
        </div>
      </main>
    </>
  );
}
