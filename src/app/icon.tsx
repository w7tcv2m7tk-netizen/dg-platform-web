import { readFile } from "fs/promises";
import { headers } from "next/headers";
import { join } from "path";

import { iconResponse, loadPublicSiteIconBytes } from "@/lib/public-site-icon";
import { knownSlugForPublicHost } from "@/lib/public-host-slugs";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

function requestHost(hdrs: Headers): string {
  return (
    hdrs.get("x-dg-custom-host") ||
    hdrs.get("x-forwarded-host") ||
    hdrs.get("host") ||
    ""
  )
    .split(",")[0]
    .trim()
    .toLowerCase()
    .split(":")[0];
}

/** Browser tab / PWA icon — host-aware; uses org business profile icon when available. */
export default async function Icon() {
  const host = requestHost(await headers());
  const slug = knownSlugForPublicHost(host);

  if (slug) {
    const branded = await loadPublicSiteIconBytes(slug, "icon");
    if (branded) return iconResponse(branded.buf, branded.contentType);
  }

  const buf = await readFile(join(process.cwd(), "public/brand/dg-icon.png"));
  return iconResponse(buf, "image/png");
}
