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
      <p className="dg-page-eyebrow">
        {resolvedEyebrow}
      </p>
      <h1 className="dg-app-page-title">{title}</h1>
      <p className="dg-page-description">{description}</p>
    </header>
  );
}
