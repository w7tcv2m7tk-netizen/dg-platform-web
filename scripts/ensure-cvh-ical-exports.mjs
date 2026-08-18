/**
 * Backfill CVH AccommodationUnit slug + DigitalGate iCal export URLs/tokens.
 * Usage: node --env-file=.env.local scripts/ensure-cvh-ical-exports.mjs
 */
import { config } from "dotenv";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });
const prisma = new PrismaClient();

const TITLE_MAP = [
  [/garden\s+studio|private\s+studio/i, "garden-studio"],
  [/tiny\s+home/i, "tiny-home"],
  [/sanctuary\s+dome/i, "sanctuary-dome"],
  [/rainforest\s+dome/i, "rainforest-dome"],
  [/canopy\s+dome/i, "canopy-dome"],
  [/starlight\s+dome/i, "starlight-dome"],
  [/the\s+shed/i, "the-shed"],
];

const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function newToken() {
  const bytes = randomBytes(32);
  let out = "";
  for (let i = 0; i < 32; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

function extractToken(url) {
  const m = String(url || "").match(/\/ical\/[^/]+\/([a-zA-Z0-9]+)\.ics/i);
  return m?.[1] && m[1].length >= 16 ? m[1] : null;
}

function resolveSlug(unit) {
  const existing = unit.slug?.trim().toLowerCase();
  if (existing) return existing;
  for (const [re, slug] of TITLE_MAP) {
    if (re.test(unit.title || "")) return slug;
  }
  return null;
}

async function main() {
  const org = await prisma.organisation.findFirst({
    where: {
      OR: [
        { slug: "currumbin-valley-hideaway" },
        { name: { contains: "Currumbin", mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, slug: true },
  });
  if (!org) {
    console.error("CVH organisation not found");
    process.exit(1);
  }

  const base =
    process.env.NEXT_PUBLIC_ICAL_BASE_URL?.replace(/\/$/, "") ||
    "https://app.digitalgate.com.au";
  // Never write localhost into OTA calendar URLs even if APP_URL is local.
  const safeBase = /localhost|127\.0\.0\.1/i.test(base)
    ? "https://app.digitalgate.com.au"
    : base;

  const units = await prisma.accommodationUnit.findMany({
    where: { organisationId: org.id },
  });

  let updated = 0;
  for (const unit of units) {
    const slug = resolveSlug(unit);
    if (!slug) {
      console.warn(`skip (no slug): ${unit.title}`);
      continue;
    }

    const meta =
      unit.metadata && typeof unit.metadata === "object" && !Array.isArray(unit.metadata)
        ? { ...unit.metadata }
        : {};

    const token =
      (typeof meta.icalExportToken === "string" && meta.icalExportToken.length >= 16
        ? meta.icalExportToken
        : null) ||
      extractToken(unit.icalExportUrl) ||
      newToken();

    const platformUrl = `${safeBase}/api/public/accommodation/ical/${encodeURIComponent(slug)}/${encodeURIComponent(token)}.ics`;
    const prev = unit.icalExportUrl?.trim() || "";
    if (
      prev.includes("currumbinvalleyhideaway.com.au/ical/") &&
      !meta.icalExportWpUrl
    ) {
      meta.icalExportWpUrl = prev;
    }
    meta.icalExportToken = token;

    if (
      unit.slug === slug &&
      prev === platformUrl &&
      (unit.metadata && typeof unit.metadata === "object"
        ? unit.metadata.icalExportToken
        : null) === token
    ) {
      console.log(`ok: ${unit.title} (${slug})`);
      continue;
    }

    await prisma.accommodationUnit.update({
      where: { id: unit.id },
      data: { slug, icalExportUrl: platformUrl, metadata: meta },
    });
    updated += 1;
    console.log(`updated: ${unit.title} → ${slug}`);
  }

  console.log(JSON.stringify({ org: org.slug, updated, total: units.length }, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
