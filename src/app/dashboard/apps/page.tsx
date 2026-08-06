import { AppsPlanCatalog } from "@/components/platform/AppsPlanCatalog";

const DIGITALGATE_WEBSITE = "https://digitalgate.com.au";

export default function AppsPage() {
  return (
    <>
      <header className="dg-page-header">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Apps & plan</h1>
            <p className="text-sm text-slate-400">
              Same structure as{" "}
              <a
                href={`${DIGITALGATE_WEBSITE}/pricing`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                digitalgate.com.au/pricing
              </a>
              — configure your tier and apps for this organisation.
            </p>
          </div>
          <a
            href={`${DIGITALGATE_WEBSITE}/pricing`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-900 hover:text-white"
          >
            Pricing & checkout ↗
          </a>
        </div>
      </header>

      <main className="dg-page-main">
        <AppsPlanCatalog />
      </main>
    </>
  );
}
