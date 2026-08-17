import { buildCvhSequenceEmailPreviews } from "@dg/platform-core";
import type { Metadata } from "next";
import { Suspense } from "react";

import { SequenceEmailPreview } from "@/components/marketing/SequenceEmailPreview";

export const metadata: Metadata = {
  title: "Sequenced email review · Currumbin Valley Hideaway",
  robots: { index: false, follow: false },
};

export default async function SequenceEmailPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const items = buildCvhSequenceEmailPreviews();

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070B14]" />}>
      <SequenceEmailPreview items={items} initialId={id} />
    </Suspense>
  );
}
