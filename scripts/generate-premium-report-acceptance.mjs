import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { buildOpportunityReportPdfFromSnapshot } from "../src/lib/opportunity-report-pdf.ts";

const root = path.resolve(process.cwd());
if (!root.startsWith("/Volumes/Developer/")) {
  throw new Error("Local acceptance harness must run inside the authorised Developer SSD.");
}
const args = new Map();
for (const arg of process.argv.slice(2)) {
  const [key, ...rest] = arg.split("=");
  args.set(key, rest.join("="));
}
const snapshotDir = args.get("--snapshots");
const outputDir = args.get("--out");
if (!snapshotDir || !outputDir) throw new Error("Usage: --snapshots=<dir> --out=<dir>");
const snapshots = path.resolve(snapshotDir);
const out = path.resolve(outputDir);
if (!snapshots.startsWith("/Volumes/Developer/") || !out.startsWith("/Volumes/Developer/")) {
  throw new Error("Snapshots and output must remain on the Developer SSD.");
}

const files = (await readdir(snapshots)).filter((name) => name.endsWith(".json")).sort();
if (!files.length) throw new Error("No snapshot JSON files found.");
const manifest = [];
for (const file of files) {
  const snapshot = JSON.parse(await readFile(path.join(snapshots, file), "utf8"));
  const generated = await buildOpportunityReportPdfFromSnapshot(snapshot);
  const doc = await PDFDocument.load(generated);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    page.drawText("LOCAL ONLY · NOT HOSTED ACCEPTANCE", {
      x: width - 194, y: height - 14, size: 5.8, font, color: rgb(0.475, 0.314, 0.769),
    });
  }
  doc.setSubject(`${doc.getSubject() || "DigitalGate Premium Report V1"} · LOCAL ONLY — not hosted acceptance`);
  doc.setKeywords(["DigitalGate", "Digital Opportunity Report", "LOCAL ONLY", "not hosted acceptance"]);
  const saved = await doc.save();
  const slug = file.replace(/\.json$/i, "");
  const pdfPath = path.join(out, `${slug}-LOCAL-ONLY.pdf`);
  await writeFile(pdfPath, saved);
  const pages = doc.getPages().map((page) => {
    const { width, height } = page.getSize();
    return { width, height };
  });
  const nonA4 = pages.filter(({ width, height }) => Math.abs(width - 595.28) > 0.5 || Math.abs(height - 841.89) > 0.5);
  if (nonA4.length) throw new Error(`${slug} contains non-A4 pages`);
  manifest.push({
    slug,
    businessName: snapshot.prospect.businessName,
    sourceSnapshot: file,
    sourceSnapshotSha256: createHash("sha256").update(await readFile(path.join(snapshots, file))).digest("hex"),
    pdf: path.basename(pdfPath),
    pdfSha256: createHash("sha256").update(saved).digest("hex"),
    bytes: saved.length,
    pages: pages.length,
    pageSize: "A4 595.28 x 841.89 pt",
    localOnly: true,
    hostedAcceptance: false,
    designVersion: "V1",
    label: "LOCAL ONLY · NOT HOSTED ACCEPTANCE",
    links: { strategySession: "https://digitalgate.com.au/strategy-session" },
  });
  console.log(`${slug}: ${pages.length} pages, ${saved.length} bytes`);
}
await writeFile(path.join(out, "manifest.json"), JSON.stringify({ generatedAt: new Date().toISOString(), localOnly: true, hostedAcceptance: false, artifacts: manifest }, null, 2));
console.log(`Wrote ${manifest.length} local-only PDFs to ${out}`);
