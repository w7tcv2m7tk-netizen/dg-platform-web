import type { ReactNode } from "react";

import { SeoFlagshipNav } from "@/components/seo/SeoFlagshipNav";

export default function SeoLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SeoFlagshipNav />
      {children}
    </>
  );
}
