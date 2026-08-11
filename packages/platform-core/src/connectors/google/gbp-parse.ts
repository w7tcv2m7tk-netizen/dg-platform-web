/**
 * Pure GBP response parsers (no auth / network) — easy to unit-test.
 */

export type GbpAccountSummary = {
  name: string;
  accountName?: string;
  type?: string;
  role?: string;
  verificationState?: string;
};

export type GbpLocationSummary = {
  name: string;
  title?: string;
  storeCode?: string;
  websiteUri?: string;
  primaryPhone?: string;
  addressLines?: string[];
  locality?: string;
  administrativeArea?: string;
  postalCode?: string;
  regionCode?: string;
  primaryCategory?: string;
  placeId?: string;
  mapsUri?: string;
  newReviewUri?: string;
  latitude?: number;
  longitude?: number;
  openInfoStatus?: string;
  description?: string;
};

export type GbpReviewCacheItem = {
  reviewId: string;
  name: string;
  locationName: string;
  reviewerDisplayName?: string;
  starRating?: number | null;
  comment?: string | null;
  createTime?: string | null;
  updateTime?: string | null;
  reviewReplyComment?: string | null;
};

const STAR_MAP: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function mapGbpStarRating(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const mapped = STAR_MAP[raw.toUpperCase()];
    if (mapped != null) return mapped;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function parseGbpAccounts(data: unknown): GbpAccountSummary[] {
  const root = asRecord(data);
  const list = root && Array.isArray(root.accounts) ? root.accounts : [];
  return list.flatMap((item) => {
    const a = asRecord(item);
    if (!a) return [];
    const name = asString(a.name);
    if (!name) return [];
    const summary: GbpAccountSummary = { name };
    const accountName = asString(a.accountName);
    const type = asString(a.type);
    const role = asString(a.role);
    const verificationState = asString(a.verificationState);
    if (accountName) summary.accountName = accountName;
    if (type) summary.type = type;
    if (role) summary.role = role;
    if (verificationState) summary.verificationState = verificationState;
    return [summary];
  });
}

export function parseGbpLocation(raw: unknown): GbpLocationSummary | null {
  const loc = asRecord(raw);
  if (!loc) return null;
  const name = asString(loc.name);
  if (!name) return null;

  const phoneNumbers = asRecord(loc.phoneNumbers);
  const address = asRecord(loc.storefrontAddress);
  const categories = asRecord(loc.categories);
  const primaryCategory = asRecord(categories?.primaryCategory);
  const metadata = asRecord(loc.metadata);
  const latlng = asRecord(loc.latlng);
  const openInfo = asRecord(loc.openInfo);
  const profile = asRecord(loc.profile);

  const addressLines = Array.isArray(address?.addressLines)
    ? address!.addressLines.filter((l): l is string => typeof l === "string")
    : undefined;

  return {
    name,
    title: asString(loc.title),
    storeCode: asString(loc.storeCode),
    websiteUri: asString(loc.websiteUri),
    primaryPhone: asString(phoneNumbers?.primaryPhone),
    addressLines,
    locality: asString(address?.locality),
    administrativeArea: asString(address?.administrativeArea),
    postalCode: asString(address?.postalCode),
    regionCode: asString(address?.regionCode),
    primaryCategory: asString(primaryCategory?.displayName),
    placeId: asString(metadata?.placeId),
    mapsUri: asString(metadata?.mapsUri),
    newReviewUri: asString(metadata?.newReviewUri),
    latitude: asNumber(latlng?.latitude),
    longitude: asNumber(latlng?.longitude),
    openInfoStatus: asString(openInfo?.status),
    description: asString(profile?.description),
  };
}

export function parseGbpLocations(data: unknown): GbpLocationSummary[] {
  const root = asRecord(data);
  const list = root && Array.isArray(root.locations) ? root.locations : [];
  return list.flatMap((item) => {
    const loc = parseGbpLocation(item);
    return loc ? [loc] : [];
  });
}

export function parseGbpReviews(
  data: unknown,
  locationName: string,
): GbpReviewCacheItem[] {
  const root = asRecord(data);
  const list = root && Array.isArray(root.reviews) ? root.reviews : [];
  return list.flatMap((item) => {
    const r = asRecord(item);
    if (!r) return [];
    const name = asString(r.name);
    if (!name) return [];
    const reviewer = asRecord(r.reviewer);
    const reply = asRecord(r.reviewReply);
    const reviewId = name.split("/").pop() || name;
    const row: GbpReviewCacheItem = {
      reviewId,
      name,
      locationName,
      starRating: mapGbpStarRating(r.starRating),
      comment: asString(r.comment) ?? null,
      createTime: asString(r.createTime) ?? null,
      updateTime: asString(r.updateTime) ?? null,
      reviewReplyComment: asString(reply?.comment) ?? null,
    };
    const reviewerDisplayName = asString(reviewer?.displayName);
    if (reviewerDisplayName) row.reviewerDisplayName = reviewerDisplayName;
    return [row];
  });
}

/** Business Information returns `locations/{id}`; reviews v4 needs `accounts/{a}/locations/{id}`. */
export function toGbpReviewsParent(
  accountName: string,
  locationName: string,
): string {
  if (locationName.startsWith("accounts/")) return locationName;
  const locId = locationName.includes("/")
    ? locationName.split("/").pop()!
    : locationName;
  return `${accountName}/locations/${locId}`;
}

export function mapGbpReviewsToFeedItems(reviews: GbpReviewCacheItem[]) {
  return reviews.map((r) => ({
    id: `gbp:${r.reviewId}`,
    source: "Google Business Profile",
    authorName: r.reviewerDisplayName ?? null,
    rating: r.starRating ?? null,
    title: null as string | null,
    content: r.comment ?? null,
    reviewDate: r.createTime ?? r.updateTime ?? null,
    sourceUrl: null as string | null,
    listingId: r.locationName,
    responded: Boolean(r.reviewReplyComment?.trim()),
  }));
}
