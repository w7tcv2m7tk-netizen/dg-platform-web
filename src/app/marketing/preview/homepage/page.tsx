import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";

import { DgHomepageScrollScenes } from "@/components/websites/DgHomepageScrollScenes";
import { DgMarketingMotion } from "@/components/websites/DgMarketingMotion";

export const metadata: Metadata = {
  title: "Homepage design preview | DigitalGate",
  description:
    "Internal preview of the approved DigitalGate homepage production port. Not the live Website Studio-published homepage.",
  robots: { index: false, follow: false },
};

/**
 * Renders the authored marketing/pages/homepage.html island for visual QA.
 * Does not read or write Neon / Website Studio. Production digitalgate.com.au
 * continues to serve the Studio-published page until an approved seed.
 */
export default async function HomepageDesignPreviewPage() {
  const filePath = path.join(process.cwd(), "marketing/pages/homepage.html");
  const html = await readFile(filePath, "utf8");

  return (
    <div className="dg-hp-preview-shell min-h-screen bg-[#03050A] text-white">
      <div className="border-b border-white/10 bg-[#0A0E17]/95 px-4 py-3 text-center text-xs text-slate-400">
        Design preview — authored <code className="text-violet-300">marketing/pages/homepage.html</code>
        {" · "}
        Neon / Website Studio untouched · not indexed
      </div>
      <div
        className="wb-html-island wb-html-island--page"
        // Authored marketing HTML island (same shape Website Studio stores).
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <DgHomepageScrollScenes />
      <DgMarketingMotion />
    </div>
  );
}
