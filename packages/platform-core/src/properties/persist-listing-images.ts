/**
 * Server-only listing image persistence (Blob / local org assets).
 * Keep this module off static client import graphs — it pulls node:fs/promises.
 */

import { storeOrgFile } from "../assets/org-brand-storage";
import { safeExternalFetch } from "../command-centre/growth-engine/ssrf-guard";

function isEphemeralImageUrl(url: string): boolean {
  return /images-uat\.corelogic\.asia|signature=|corelogic\.asia\/.*\?/i.test(url);
}

/**
 * Copy remote listing photos into durable org Blob storage when they look ephemeral
 * (signed Cotality/UAT URLs). Already-blob / stable URLs are left alone.
 */
export async function persistPropertyListingImages(
  organisationId: string,
  propertyId: string,
  images: string[],
): Promise<string[]> {
  const out: string[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < images.length; i += 1) {
    const src = String(images[i] || "").trim();
    if (!src || seen.has(src)) continue;
    seen.add(src);

    if (!isEphemeralImageUrl(src) && /blob\.vercel-storage\.com|\/org-assets\//i.test(src)) {
      out.push(src);
      continue;
    }

    try {
      // Image URLs arrive from tenant/WordPress data, so validate every hop
      // and bound the request rather than following redirects blindly.
      const res = await safeExternalFetch(src, {
        headers: { Accept: "image/*,*/*" },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) continue;
      const contentType = (res.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
      if (!contentType.startsWith("image/")) continue;
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length < 1000) continue;
      const stored = await storeOrgFile({
        organisationId,
        buffer,
        contentType,
        maxBytes: 8 * 1024 * 1024,
        sizeLabel: "Listing image",
        keyPrefix: `listing-images/${propertyId}`,
      });
      out.push(stored.url);
    } catch {
      // Keep original if mirror fails — better than dropping the gallery entirely.
      if (!isEphemeralImageUrl(src)) out.push(src);
    }
  }

  return out;
}
