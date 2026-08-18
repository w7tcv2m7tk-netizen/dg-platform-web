/**
 * Canonical CVH unit display order for Gen 2 Acc surfaces (calendar, units, HK).
 * Match by slug first, then by title / branded "Site — Unit" tail. Unknown units
 * sort after the named set, alphabetically by title.
 */

export const CVH_UNIT_DISPLAY_ORDER = [
  "garden-studio",
  "tiny-home",
  "sanctuary-dome",
  "rainforest-dome",
  "canopy-dome",
  "starlight-dome",
  "the-shed",
] as const;

export type CvhUnitDisplaySlug = (typeof CVH_UNIT_DISPLAY_ORDER)[number];

const ORDER_INDEX = new Map<string, number>(
  CVH_UNIT_DISPLAY_ORDER.map((slug, i) => [slug, i]),
);

/** Title phrases → canonical slug (covers WP titles without matching post_name). */
const TITLE_TO_SLUG: Array<{ re: RegExp; slug: CvhUnitDisplaySlug }> = [
  { re: /\bgarden\s+studio\b/i, slug: "garden-studio" },
  { re: /\bprivate\s+studio\b/i, slug: "garden-studio" },
  { re: /\btiny\s+home\b/i, slug: "tiny-home" },
  { re: /\bsanctuary\s+dome\b/i, slug: "sanctuary-dome" },
  { re: /\brainforest\s+dome\b/i, slug: "rainforest-dome" },
  { re: /\bcanopy\s+dome\b/i, slug: "canopy-dome" },
  { re: /\bstarlight\s+dome\b/i, slug: "starlight-dome" },
  { re: /\bthe\s+shed\b/i, slug: "the-shed" },
];

function slugifySegment(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Distinctive unit name from branded titles like "CVH — Rainforest Dome". */
export function accommodationUnitDisplayTail(title: string): string {
  const parts = title.split(/\s+[—–|-]\s+/);
  if (parts.length > 1) {
    const tail = parts[parts.length - 1]!.trim();
    if (tail.length >= 3 && tail.length < title.length) return tail;
  }
  return title.trim();
}

export function resolveCvhUnitDisplaySlug(input: {
  slug?: string | null;
  title?: string | null;
}): CvhUnitDisplaySlug | null {
  const slugRaw = input.slug?.trim().toLowerCase();
  if (slugRaw) {
    if (slugRaw === "private-studio") return "garden-studio";
    const direct = ORDER_INDEX.has(slugRaw) ? (slugRaw as CvhUnitDisplaySlug) : null;
    if (direct) return direct;
    const slugified = slugifySegment(slugRaw);
    if (slugified === "private-studio") return "garden-studio";
    if (ORDER_INDEX.has(slugified)) return slugified as CvhUnitDisplaySlug;
  }

  const title = input.title?.trim();
  if (!title) return null;

  const tail = accommodationUnitDisplayTail(title);
  const fromTail = slugifySegment(tail);
  if (ORDER_INDEX.has(fromTail)) return fromTail as CvhUnitDisplaySlug;

  const fromFull = slugifySegment(title);
  if (ORDER_INDEX.has(fromFull)) return fromFull as CvhUnitDisplaySlug;

  for (const { re, slug } of TITLE_TO_SLUG) {
    if (re.test(tail) || re.test(title)) return slug;
  }
  return null;
}

export function accommodationUnitDisplayOrderIndex(input: {
  slug?: string | null;
  title?: string | null;
}): number {
  const key = resolveCvhUnitDisplaySlug(input);
  if (key == null) return CVH_UNIT_DISPLAY_ORDER.length;
  return ORDER_INDEX.get(key) ?? CVH_UNIT_DISPLAY_ORDER.length;
}

export type AccommodationUnitOrderable = {
  slug?: string | null;
  title?: string | null;
  name?: string | null;
};

function orderTitle(u: AccommodationUnitOrderable): string {
  return (u.title ?? u.name ?? "").trim();
}

/**
 * Stable CVH display sort. Named units first (canonical order); unknowns after, A–Z by title.
 */
export function sortAccommodationUnitsByDisplayOrder<T extends AccommodationUnitOrderable>(
  units: T[],
): T[] {
  return [...units].sort((a, b) => {
    const ia = accommodationUnitDisplayOrderIndex({
      slug: a.slug,
      title: orderTitle(a),
    });
    const ib = accommodationUnitDisplayOrderIndex({
      slug: b.slug,
      title: orderTitle(b),
    });
    if (ia !== ib) return ia - ib;
    return orderTitle(a).localeCompare(orderTitle(b), undefined, {
      sensitivity: "base",
    });
  });
}
