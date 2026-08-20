import { ImageResponse } from "next/og";
import { headers } from "next/headers";
import { readFile } from "fs/promises";
import { join } from "path";

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

/** Browser tab / PWA icon — host-aware for public brand sites. */
export default async function Icon() {
  const host = requestHost(await headers());
  const slug = knownSlugForPublicHost(host);

  if (slug === "wantd") {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#121212",
            borderRadius: 128,
          }}
        >
          <div
            style={{
              fontSize: 320,
              fontWeight: 800,
              color: "#C6F04A",
              fontFamily: "system-ui, sans-serif",
              letterSpacing: "-16px",
              lineHeight: 1,
              marginTop: 24,
            }}
          >
            d
          </div>
        </div>
      ),
      { ...size },
    );
  }

  const buf = await readFile(join(process.cwd(), "public/brand/dg-icon.png"));
  return new Response(buf, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
