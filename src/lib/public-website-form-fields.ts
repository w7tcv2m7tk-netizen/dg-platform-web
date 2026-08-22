/**
 * Map leftover WP / generic HTML form fields onto Gen 2 website capture.
 */

export type WebsiteFormFields = {
  name: string;
  email?: string;
  phone?: string;
  message?: string;
  pageSlug?: string;
  siteSlug?: string;
  honeypot?: string;
};

const SKIP_KEYS = new Set([
  "action",
  "source",
  "submit",
  "form_type",
  "form-type",
  "_wpnonce",
  "_wpcf7",
  "_wpcf7_version",
  "_wpcf7_locale",
  "_wpcf7_unit_tag",
  "_wpcf7_container_post",
  "g-recaptcha-response",
  "honeypot",
  "website_hp",
  "websitehp",
  "website",
  "siteSlug",
  "siteslug",
  "pageSlug",
  "page_slug",
  "pageslug",
]);

function asScalar(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
      .join(", ");
  }
  if (value == null) return "";
  return String(value).trim();
}

function first(
  raw: Record<string, unknown>,
  keys: string[],
): string {
  for (const key of keys) {
    if (!(key in raw)) continue;
    const value = asScalar(raw[key]);
    if (value) return value;
  }
  const lower = new Map(
    Object.keys(raw).map((k) => [k.toLowerCase(), k] as const),
  );
  for (const key of keys) {
    const actual = lower.get(key.toLowerCase());
    if (!actual) continue;
    const value = asScalar(raw[actual]);
    if (value) return value;
  }
  return "";
}

export function mapWebsiteFormFields(
  raw: Record<string, unknown>,
): WebsiteFormFields {
  const honeypot = first(raw, ["honeypot", "website_hp", "websiteHp", "website"]);
  const name = first(raw, [
    "name",
    "full_name",
    "fullName",
    "your-name",
    "yourname",
    "contact_name",
    "contactName",
    "your-name",
  ]);
  const email = first(raw, [
    "email",
    "your-email",
    "youremail",
    "contact_email",
    "contactEmail",
  ]);
  const phone = first(raw, [
    "phone",
    "tel",
    "telephone",
    "your-phone",
    "yourphone",
    "contact_phone",
    "contactPhone",
    "mobile",
  ]);
  const subject = first(raw, ["subject", "your-subject"]);
  const body = first(raw, [
    "message",
    "comments",
    "comment",
    "your-message",
    "yourmessage",
    "goals_message",
    "notes",
    "enquiry",
    "inquiry",
  ]);

  const extras: string[] = [];
  for (const [key, value] of Object.entries(raw)) {
    const norm = key.toLowerCase();
    if (SKIP_KEYS.has(norm) || SKIP_KEYS.has(key)) continue;
    if (
      [
        "name",
        "full_name",
        "fullname",
        "your-name",
        "yourname",
        "contact_name",
        "contactname",
        "email",
        "your-email",
        "youremail",
        "contact_email",
        "contactemail",
        "phone",
        "tel",
        "telephone",
        "your-phone",
        "yourphone",
        "contact_phone",
        "contactphone",
        "mobile",
        "subject",
        "your-subject",
        "message",
        "comments",
        "comment",
        "your-message",
        "yourmessage",
        "goals_message",
        "notes",
        "enquiry",
        "inquiry",
      ].includes(norm)
    ) {
      continue;
    }
    const text = asScalar(value);
    if (!text) continue;
    extras.push(`${key.replace(/[_-]+/g, " ")}: ${text}`);
  }

  const message = [subject && `Subject: ${subject}`, body, extras.join("\n")]
    .filter(Boolean)
    .join("\n\n");

  return {
    name: name || "Website enquiry",
    email: email || undefined,
    phone: phone || undefined,
    message: message || undefined,
    pageSlug:
      first(raw, ["pageSlug", "page_slug", "page"]) || undefined,
    siteSlug: first(raw, ["siteSlug", "site_slug", "site"]) || undefined,
    honeypot: honeypot || undefined,
  };
}

export async function readPublicFormRecord(
  req: Request,
): Promise<Record<string, unknown> | null> {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const json = (await req.json().catch(() => null)) as unknown;
    if (!json || typeof json !== "object" || Array.isArray(json)) return null;
    return json as Record<string, unknown>;
  }
  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await req.formData().catch(() => null);
    if (!form) return null;
    const body: Record<string, unknown> = {};
    for (const key of new Set(form.keys())) {
      const all = form.getAll(key).map(String).filter(Boolean);
      body[key] = all.length > 1 ? all : (all[0] ?? "");
    }
    return body;
  }
  const json = (await req.json().catch(() => null)) as unknown;
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  return json as Record<string, unknown>;
}
