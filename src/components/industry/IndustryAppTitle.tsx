import { INDUSTRY_TAXONOMY } from "@dg/platform-core";

function resolveIndustryEyebrow(title: string) {
  const parent = INDUSTRY_TAXONOMY.find((group) =>
    group.subIndustries.some((subIndustry) => subIndustry.name === title),
  );
  return parent?.name ?? "Industry App";
}

export function IndustryAppTitle({
  title,
  description,
  eyebrow,
}: {
  title: string;
  description: string;
  eyebrow?: string;
}) {
  const resolvedEyebrow = eyebrow ?? resolveIndustryEyebrow(title);

  return (
    <header className="dg-page-header">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300/80">
        {resolvedEyebrow}
      </p>
      <h1 className="dg-page-title mt-1 text-white">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm text-slate-400 sm:text-base">{description}</p>
    </header>
  );
}
