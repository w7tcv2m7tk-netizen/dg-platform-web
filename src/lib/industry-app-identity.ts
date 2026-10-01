import { INDUSTRY_TAXONOMY } from "@dg/platform-core";

export function resolveSelectedIndustryIdentity(
  appId: string,
  selectionIds: string[],
  fallbackTitle: string,
) {
  for (const group of INDUSTRY_TAXONOMY) {
    const selected = group.subIndustries.find(
      (subIndustry) =>
        subIndustry.appId === appId && selectionIds.includes(subIndustry.id),
    );
    if (selected) return { eyebrow: group.name, title: selected.name };
  }

  const parent = INDUSTRY_TAXONOMY.find((group) => group.appIds.includes(appId));
  return { eyebrow: parent?.name ?? "Industry App", title: fallbackTitle };
}
