import type { MetadataRoute } from "next";

import { BRAND_DEFAULT } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  const base: MetadataRoute.Manifest = {
    id: "/",
    name: "DigitalGate Business Platform",
    short_name: "DigitalGate",
    description: "CRM, industry apps, and growth tools — your business command centre",
    // Stay on app origin (scope "/"). Clerk handshake must also stay on-origin via FAPI proxy.
    start_url: "/dashboard?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#020617",
    theme_color: "#020617",
    categories: ["business", "productivity"],
    icons: [
      {
        src: BRAND_DEFAULT.icon,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: BRAND_DEFAULT.icon,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/brand/favicon-32.png",
        sizes: "32x32",
        type: "image/png",
        purpose: "any",
      },
    ],
  };

  // Prefer existing standalone window when OS opens app links (Chromium).
  // Not yet in Next's Manifest type — still emitted in webmanifest JSON.
  return {
    ...base,
    launch_handler: {
      client_mode: ["navigate-existing", "auto"],
    },
  } as MetadataRoute.Manifest;
}
