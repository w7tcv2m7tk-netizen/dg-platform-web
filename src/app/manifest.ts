import type { MetadataRoute } from "next";

import { BRAND_DEFAULT } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DigitalGate Business Platform",
    short_name: "DigitalGate",
    description: "CRM, industry apps, and growth tools — your business command centre",
    start_url: "/dashboard",
    scope: "/",
    display: "browser",
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
    ],
  };
}
