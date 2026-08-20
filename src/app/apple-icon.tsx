import { readFile } from "fs/promises";
import { headers } from "next/headers";
import { ImageResponse } from "next/og";
import { join } from "path";

import { knownSlugForPublicHost } from "@/lib/public-host-slugs";

export const size = { width: 180, height: 180 };
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

/** Apple / Dock / home-screen icon — host-aware for public brand sites. */
export default async function AppleIcon() {
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
          }}
        >
          <div
            style={{
              fontSize: 112,
              fontWeight: 800,
              color: "#C6F04A",
              fontFamily: "system-ui, sans-serif",
              letterSpacing: "-6px",
              lineHeight: 1,
              marginTop: 8,
            }}
          >
            d
          </div>
        </div>
      ),
      { ...size },
    );
  }

  const buf = await readFile(join(process.cwd(), "public/brand/dg-apple-touch.png"));
  return new Response(buf, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
