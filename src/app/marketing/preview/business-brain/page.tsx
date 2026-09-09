import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";

import { DgMarketingMotion } from "@/components/websites/DgMarketingMotion";

export const metadata: Metadata = {
  title: "Business Brain design preview | DigitalGate",
  description:
    "Internal preview of the authored DigitalGate Business Brain page (incl. Meet Aida). Not the live Website Studio-published page.",
  robots: { index: false, follow: false },
};

/**
 * Renders the authored marketing/pages/business-brain-page.html island for
 * visual QA. Does not read or write Neon / Website Studio. Production continues
 * to serve the Studio-published page until an approved seed.
 */
export default async function BusinessBrainDesignPreviewPage() {
  const filePath = path.join(
    process.cwd(),
    "marketing/pages/business-brain-page.html",
  );
  const html = await readFile(filePath, "utf8");

  return (
    <div className="min-h-screen bg-[#0A0E17] text-white">
      <div className="border-b border-white/10 bg-[#0A0E17]/95 px-4 py-3 text-center text-xs text-slate-400">
        Design preview — authored{" "}
        <code className="text-violet-300">
          marketing/pages/business-brain-page.html
        </code>
        {" · "}
        Neon / Website Studio untouched · not indexed
      </div>
      <div
        className="wb-html-island wb-html-island--page"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <DgMarketingMotion />
    </div>
  );
}
