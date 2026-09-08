import type { Metadata } from "next";

import { PlatformOverviewPreview } from "@/components/marketing/PlatformOverviewPreview";

/**
 * Public design preview of the DigitalGate Platform Overview page, served under
 * the established `/marketing/preview/*` namespace (already exempt from Clerk
 * app authentication in `PUBLIC_ROUTE_PATTERNS`). This lets the design be
 * visually accepted on a real Vercel preview URL without a DigitalGate login.
 * Content authority stays in Website Studio; this route only renders it.
 */

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Platform Overview — Design Preview | DigitalGate",
  description:
    "Design preview of the DigitalGate Platform Overview page. Not for indexing.",
  robots: { index: false, follow: false },
};

export default function PlatformMarketingPreviewPage() {
  return <PlatformOverviewPreview />;
}
