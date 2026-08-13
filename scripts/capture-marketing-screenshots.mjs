#!/usr/bin/env node
/**
 * Capture marketing screenshots from public preview routes.
 * Usage: npm run dev (separate terminal) then node scripts/capture-marketing-screenshots.mjs
 */
import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "public/marketing/screenshots");
const baseUrl = process.env.MARKETING_SCREENSHOT_BASE_URL ?? "http://localhost:3000";

const scenes = [
  ["overview", "dashboard-overview.png"],
  ["crm", "crm-contacts.png"],
  ["ai-studio", "ai-assistant.png"],
  ["vendor-pipeline", "vendor-pipeline.png"],
  ["website-health", "website-health.png"],
  ["ai-visibility", "ai-visibility.png"],
];

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

for (const [scene, filename] of scenes) {
  const url = `${baseUrl}/marketing/preview/${scene}`;
  console.log(`Capturing ${url} → ${filename}`);
  await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(outDir, filename),
    type: "png",
  });
}

await browser.close();
console.log(`Saved ${scenes.length} screenshots to ${outDir}`);

const wpAssets = path.resolve(root, "../dg-platform/marketing/assets/screenshots");
try {
  await mkdir(wpAssets, { recursive: true });
  for (const [, filename] of scenes) {
    await copyFile(path.join(outDir, filename), path.join(wpAssets, filename));
  }
  console.log(`Copied to ${wpAssets}`);
} catch {
  console.log("Skipped copy to dg-platform (path not found)");
}
