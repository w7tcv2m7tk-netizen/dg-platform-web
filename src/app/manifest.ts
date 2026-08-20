import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { BRAND_DEFAULT } from "@/lib/brand";
import { knownSlugForPublicHost } from "@/lib/public-host-slugs";

function requestHost(): Promise<string> {
  return headers().then((hdrs) =>
    (
      hdrs.get("x-dg-custom-host") ||
      hdrs.get("x-forwarded-host") ||
      hdrs.get("host") ||
      ""
    )
      .split(",")[0]
      .trim()
      .toLowerCase()
      .split(":")[0],
  );
}

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const host = await requestHost();
  const slug = knownSlugForPublicHost(host);

  if (slug === "wantd") {
    return {
      id: "/",
      name: "Wantd",
      short_name: "Wantd",
      description:
        "Demand-first marketplace. Post what you WANT — Wantd matches supply.",
      start_url: "/?source=pwa",
      scope: "/",
      display: "standalone",
      display_override: ["standalone", "minimal-ui"],
      orientation: "any",
      background_color: "#f7f4ec",
      theme_color: "#121212",
      categories: ["lifestyle", "business"],
      icons: [
        {
          src: "/icon",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/icon",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
        {
          src: "/apple-icon",
          sizes: "180x180",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/brand/wantd-favicon-32.png",
          sizes: "32x32",
          type: "image/png",
          purpose: "any",
        },
      ],
    };
  }

  const base: MetadataRoute.Manifest = {
    id: "/",
    name: "DigitalGate Business Platform",
    short_name: "DigitalGate",
    description: "CRM, industry apps, and growth tools — your business command centre",
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

  return {
    ...base,
    launch_handler: {
      client_mode: ["navigate-existing", "auto"],
    },
  } as MetadataRoute.Manifest;
}
