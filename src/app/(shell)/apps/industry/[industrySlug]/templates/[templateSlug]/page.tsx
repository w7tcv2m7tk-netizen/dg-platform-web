import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getIndustry,
  getIndustryPrimaryHref,
  getTemplate,
  isTemplateActivatable,
} from "@dg/platform-core";

function statusBannerCopy(status: string): { title: string; body: string } {
  switch (status) {
    case "ARCHITECTURE_RESERVED":
      return {
        title: "Architecture reserved",
        body: "This Template is reserved in the Industry Platform model. It is not available to activate yet.",
      };
    case "COMING_SOON":
      return {
        title: "Coming soon",
        body: "This Template is planned for this Industry App. It is not production-ready.",
      };
    case "EARLY_ACCESS":
      return {
        title: "Early access — mount not live",
        body: "This Template is marked early access but does not yet have a Gen 2 app mount in this environment.",
      };
    case "FOUNDING":
    case "AVAILABLE":
      return {
        title: "Template planned",
        body: "Activate this Template with an Industry subscription when the Gen 2 mount ships.",
      };
    default:
      return {
        title: "Template planned",
        body: "This Industry Template is not available as a live floor yet.",
      };
  }
}

export default async function IndustryTemplateScaffoldPage({
  params,
}: {
  params: Promise<{ industrySlug: string; templateSlug: string }>;
}) {
  const { industrySlug, templateSlug } = await params;
  const industry = getIndustry(industrySlug);
  const template = getTemplate(templateSlug);

  if (!industry || !template || template.industryId !== industry.id) {
    notFound();
  }

  const hasLiveMount = Boolean(template.appId) && isTemplateActivatable(template.status);
  // Scaffold route is for templates without a dedicated Gen 2 floor, or honesty when
  // the catalogue still points here. Never present a production-ready Open CTA unless
  // both activatable and mounted — and even then prefer the real primaryHref.
  const showOpenLive =
    hasLiveMount &&
    template.primaryHref !== `/apps/industry/${industry.slug}/templates/${template.slug}`;

  const banner = statusBannerCopy(template.status);
  const industryHome =
    getIndustryPrimaryHref(industry.id) ?? `/apps/industry/${industry.slug}`;

  return (
    <main className="dg-page-main space-y-6">
      <p className="text-sm text-slate-400">
        Industry · {industry.name} · {template.name}
      </p>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-slate-300">
        <p className="font-medium text-amber-200">{banner.title}</p>
        <p className="mt-1 text-slate-400">{banner.body}</p>
        <p className="mt-2 text-xs text-slate-500">
          Status: {template.status.replaceAll("_", " ")}
        </p>
      </div>

      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-white">{template.name}</h1>
        <p className="max-w-2xl text-sm text-slate-400">{template.description}</p>
      </section>

      <section className="dg-card border-dashed border-slate-700">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Industry Template
        </p>
        <h2 className="mt-2 text-lg font-semibold text-white">
          {showOpenLive
            ? "Open live floor"
            : "Template planned — activate with Industry subscription"}
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          {showOpenLive
            ? "This Template has a Gen 2 mount. Prefer that floor for day-to-day work."
            : "Coming soon / reserved Templates stay here as honest scaffolding — not a production product surface."}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {showOpenLive ? (
            <Link
              href={template.primaryHref}
              className="rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-300 hover:bg-blue-500/15"
            >
              Open {template.name}
            </Link>
          ) : (
            <span className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-500">
              Coming soon
            </span>
          )}
          <Link
            href={industryHome}
            className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-600"
          >
            {industry.name} home
          </Link>
          <Link
            href="/dashboard/marketplace"
            className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-600"
          >
            Marketplace
          </Link>
        </div>
      </section>
    </main>
  );
}
