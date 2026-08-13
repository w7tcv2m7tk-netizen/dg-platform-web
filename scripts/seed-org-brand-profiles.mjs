#!/usr/bin/env node
/**
 * Seed brand colours, logos, and icons for known businesses.
 * Usage: node scripts/seed-org-brand-profiles.mjs [--force]
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });

const force = process.argv.includes("--force");
const prisma = new PrismaClient();

const PRESETS = {
  digitalgate: {
    brandColours: "#3B82F6, #10B981",
    iconUrl: "https://app.digitalgate.com.au/brand/icon-light.png",
    logoUrl: "https://app.digitalgate.com.au/brand/logo-on-dark.png",
    websiteUrl: "https://digitalgate.com.au",
    wp: {
      baseUrl: "https://digitalgate.com.au/wp-json/digitalgate/v1",
      label: "DigitalGate",
    },
  },
  "roe-realty": {
    brandColours: "#C9A46C, #1C2B2A",
    iconUrl: "https://roerealty.com.au/wp-content/uploads/2026/05/R-Main.png",
    logoUrl: "https://roerealty.com.au/wp-content/uploads/2026/05/R-Main.png",
    websiteUrl: "https://roerealty.com.au",
    wp: {
      baseUrl: "https://roerealty.com.au/wp-json/digitalgate/v1",
      label: "Roe Realty",
    },
  },
  cvh: {
    brandColours: "#B9A48A, #2C4137",
    iconUrl: "https://currumbinvalleyhideaway.com.au/wp-content/uploads/2026/05/Icon.png",
    logoUrl:
      "https://currumbinvalleyhideaway.com.au/wp-content/uploads/2026/06/CVH-Logo-and-Icon.png",
    websiteUrl: "https://currumbinvalleyhideaway.com.au",
    wp: {
      baseUrl: "https://currumbinvalleyhideaway.com.au/wp-json/digitalgate/v1",
      label: "Currumbin Valley Hideaway",
    },
  },
  aetherra: {
    brandColours: "#B88952, #C9B38C",
    iconUrl:
      "https://aetherra.com.au/wp-content/uploads/2026/07/cropped-Aetherra-Icon-Dark-scaled-1.png",
    logoUrl: "https://aetherra.com.au/wp-content/uploads/2026/06/Aetherra-White.png",
    websiteUrl: "https://aetherra.com.au",
    wp: {
      baseUrl: "https://aetherra.com.au/wp-json/digitalgate/v1",
      label: "Aëtherra",
    },
  },
};

function resolvePreset(org) {
  const hay = `${org.name} ${org.slug} ${org.industry ?? ""}`.toLowerCase();
  const wp =
    org.settings?.connectors?.wordpress?.baseUrl?.toLowerCase?.() ??
    String(org.settings?.connectors?.wordpress?.baseUrl ?? "").toLowerCase();

  if (hay.includes("aetherra") || hay.includes("aether")) return "aetherra";
  if (hay.includes("currumbin") || hay.includes("hideaway") || hay.includes("cvh") || wp.includes("currumbinvalleyhideaway")) {
    return "cvh";
  }
  if (hay.includes("roe") || hay.includes("realty") || hay.includes("real_estate") || wp.includes("roerealty")) {
    return "roe-realty";
  }
  if (hay.includes("digitalgate") || hay.includes("digital gate")) return "digitalgate";
  if (org.industry === "hospitality") return "cvh";
  if (org.industry === "real_estate") return "roe-realty";
  if (org.industry?.toLowerCase?.().includes("software")) return "digitalgate";
  return null;
}

async function main() {
  const orgs = await prisma.organisation.findMany({
    select: { id: true, name: true, slug: true, industry: true, settings: true },
  });

  let updated = 0;

  for (const org of orgs) {
    const key = resolvePreset(org);
    if (!key) {
      console.log(`? ${org.name}: no preset match`);
      continue;
    }

    const preset = PRESETS[key];
    const settings = org.settings ?? {};
    const profile = settings.profile ?? {};

    if (!force && profile.brandColours && profile.logoUrl && profile.iconUrl) {
      console.log(`– ${org.name}: brand already configured`);
      continue;
    }

    const nextProfile = {
      ...profile,
      brandColours: preset.brandColours,
      iconUrl: preset.iconUrl,
      logoUrl: preset.logoUrl,
      websiteUrl: profile.websiteUrl ?? preset.websiteUrl,
      updatedAt: new Date().toISOString(),
    };

    const nextSettings = { ...settings, profile: nextProfile };

    if (preset.wp) {
      nextSettings.connectors = {
        ...(settings.connectors ?? {}),
        wordpress: {
          ...(settings.connectors?.wordpress ?? {}),
          ...preset.wp,
        },
      };
    }

    await prisma.organisation.update({
      where: { id: org.id },
      data: { settings: nextSettings },
    });

    console.log(`✓ ${org.name} → ${key}`);
    updated += 1;
  }

  console.log(`\nDone. Updated ${updated} organisation(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
