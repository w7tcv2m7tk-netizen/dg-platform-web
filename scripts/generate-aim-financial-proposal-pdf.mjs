#!/usr/bin/env node
/**
 * Generate the AIM Financial × DigitalGate Founding 10 Stage 1 proposal PDF.
 *
 * Source of truth: docs/commercial/proposals/aim-financial-founding-10/proposal.html
 * Brand assets: public/brand (DigitalGate icon + wordmark)
 *
 * Usage:
 *   node scripts/generate-aim-financial-proposal-pdf.mjs
 */
import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const sourceHtml = path.join(
  root,
  "docs/commercial/proposals/aim-financial-founding-10/proposal.html",
);
const outDir = path.join(
  root,
  "docs/commercial/proposals/aim-financial-founding-10",
);
const outPdf = path.join(
  outDir,
  "AIM-Financial-DigitalGate-Founding-10-Proposal.pdf",
);
const exportPdf = "/tmp/AIM-Financial-DigitalGate-Founding-10-Proposal.pdf";

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ["--font-render-hinting=none"],
  });
  const page = await browser.newPage();
  const url = pathToFileURL(sourceHtml).href;
  await page.goto(url, { waitUntil: "networkidle" });
  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: outPdf,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });
  await browser.close();
  await copyFile(outPdf, exportPdf);
  console.log(`Wrote ${outPdf}`);
  console.log(`Copied ${exportPdf}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
