import { readFile } from "fs/promises";
import { join } from "path";

import { getPublicSiteBrand } from "@dg/platform-core";

const STATIC_APPLE_FALLBACK: Record<string, string> = {
  wantd: "/brand/wantd-apple-touch.png",
};

const STATIC_ICON_FALLBACK: Record<string, string> = {
  wantd: "/brand/wantd-icon.png",
};

function localPathFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.pathname.startsWith("/brand/") || parsed.pathname.startsWith("/public/")) {
      return parsed.pathname;
    }
  } catch {
    if (url.startsWith("/")) return url;
  }
  return null;
}

async function readLocalBrandFile(relativePath: string): Promise<Buffer | null> {
  try {
    const normalized = relativePath.replace(/^\/public/, "");
    return await readFile(join(process.cwd(), "public", normalized.replace(/^\//, "")));
  } catch {
    return null;
  }
}

async function fetchRemoteIcon(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function loadFromUrl(url: string | undefined): Promise<Buffer | null> {
  if (!url?.trim()) return null;
  const local = localPathFromUrl(url);
  if (local) {
    const buf = await readLocalBrandFile(local);
    if (buf) return buf;
  }
  if (/^https?:\/\//i.test(url)) {
    return fetchRemoteIcon(url);
  }
  if (url.startsWith("/")) {
    return readLocalBrandFile(url);
  }
  return null;
}

/** Load favicon/apple-touch bytes from the org business profile for a public site slug. */
export async function loadPublicSiteIconBytes(
  publicSlug: string,
  variant: "icon" | "apple" = "icon",
): Promise<{ buf: Buffer; contentType: string } | null> {
  const brand = await getPublicSiteBrand(publicSlug);
  const iconUrl = brand?.iconUrl;

  if (iconUrl) {
    const buf = await loadFromUrl(iconUrl);
    if (buf) {
      return {
        buf,
        contentType: iconUrl.endsWith(".svg") ? "image/svg+xml" : "image/png",
      };
    }
  }

  for (const fallbackPath of [
    STATIC_ICON_FALLBACK[publicSlug],
    variant === "apple" ? STATIC_APPLE_FALLBACK[publicSlug] : undefined,
  ].filter(Boolean) as string[]) {
    const buf = await readLocalBrandFile(fallbackPath);
    if (buf) return { buf, contentType: "image/png" };
  }

  return null;
}

export function iconResponse(buf: Buffer, contentType: string): Response {
  const bytes = new Uint8Array(buf);
  return new Response(bytes, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
