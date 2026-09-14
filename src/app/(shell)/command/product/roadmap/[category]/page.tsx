import { redirect } from "next/navigation";
import { ROADMAP_MAJOR_SECTIONS, type RoadmapMajorSectionId } from "@dg/platform-core/roadmap/taxonomy";

import { OperatorCategoryHeader } from "@/components/command/OperatorCategoryHeader";
import { PlatformRoadmapV2Panel } from "@/components/platform/PlatformRoadmapV2Panel";
import { requirePlatformOperatorContext } from "@/lib/platform-operator";

export default async function RoadmapCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  await requirePlatformOperatorContext();
  const { category } = await params;
  const valid = ROADMAP_MAJOR_SECTIONS.some((section)=>section.id===category);
  if (!valid) redirect("/command/product/roadmap");
  const meta = ROADMAP_MAJOR_SECTIONS.find((section)=>section.id===category)!;
  return <>
    <header className="dg-page-header"><OperatorCategoryHeader eyebrow="Product · Roadmap" title={meta.label} question={meta.description} backHref="/command/product/roadmap" backLabel="Roadmap" /></header>
    <main className="dg-page-main"><PlatformRoadmapV2Panel activeSection={category as RoadmapMajorSectionId} /></main>
  </>;
}
