/**
 * Restore DigitalGate site chrome footer from marketing/pages/footer.html
 * with Gen 2 brand assets (WP upload URLs 404 after apex cutover).
 *
 * Usage: node --import tsx scripts/restore-dg-footer-chrome.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

config({ path: ".env.local" });

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const footerPath = resolve(root, "../dg-platform/marketing/pages/footer.html");

const ICON =
  "https://app.digitalgate.com.au/brand/icon-light.png";
const LOGO =
  "https://app.digitalgate.com.au/brand/logo-on-dark.png";

function prepareChrome(html) {
  let out = String(html || "");
  // Drop document chrome if pasted as full HTML
  out = out
    .replace(/<!DOCTYPE[\s\S]*?<body[^>]*>/i, "")
    .replace(/<\/body>[\s\S]*$/i, "")
    .replace(/<\/?html[^>]*>/gi, "")
    .replace(/<\/?head[^>]*>/gi, "");
  // Replace retired WP media with Gen 2 brand assets
  out = out
    .replace(
      /https?:\/\/digitalgate\.com\.au\/wp-content\/uploads\/[^"'>\s]*Gate-Icon[^"'>\s]*/gi,
      ICON,
    )
    .replace(
      /https?:\/\/digitalgate\.com\.au\/wp-content\/uploads\/[^"'>\s]*DigitalGate-Banner[^"'>\s]*/gi,
      LOGO,
    )
    .replace(
      /https?:\/\/digitalgate\.com\.au\/wp-content\/uploads\/[^"'>\s]*Banner-Light[^"'>\s]*/gi,
      LOGO,
    );

  const styles = [];
  out = out.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_, css) => {
    styles.push(
      String(css)
        .replace(/(^|[,}])\s*body\s*(?=[\s,{])/gi, "$1 .wb-chrome-root ")
        .replace(/(^|[,}])\s*html\s*(?=[\s,{])/gi, "$1 .wb-chrome-root "),
    );
    return "";
  });

  // Keep FA + fonts as link tags — renderer injects via dangerouslySetInnerHTML
  const styleTag = `<style>
${styles.join("\n")}
.wb-chrome-root img{max-width:none;height:auto}
.wb-chrome-root .dg-full-logo,.wb-chrome-root img.dg-full-logo{height:28px!important;width:auto!important;max-width:11rem!important;object-fit:contain}
.wb-chrome-root .dg-gate-icon,.wb-chrome-root img.dg-gate-icon{width:32px!important;height:32px!important;object-fit:contain}
.wb-chrome-root .dg-logo-fallback{display:none}
</style>`;

  return `${styleTag}\n<div class="wb-chrome-root">\n${out.trim()}\n</div>`.trim();
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL missing");
    process.exit(1);
  }
  if (!existsSync(footerPath)) {
    console.error("Missing", footerPath);
    process.exit(1);
  }

  const raw = readFileSync(footerPath, "utf8");
  const footerHtml = prepareChrome(raw);
  console.log("Prepared footer", footerHtml.length, "chars");

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const site = await prisma.website.findUnique({ where: { slug: "digitalgate" } });
  if (!site) {
    console.error("Website slug=digitalgate not found");
    await prisma.$disconnect();
    process.exit(1);
  }

  const prev = (site.metadata && typeof site.metadata === "object"
    ? site.metadata
    : {}) ;
  const prevChrome =
    prev.chrome && typeof prev.chrome === "object" ? prev.chrome : {};

  await prisma.website.update({
    where: { id: site.id },
    data: {
      metadata: {
        ...prev,
        chrome: {
          ...prevChrome,
          footerHtml,
          // Keep existing header unless empty
          headerHtml: prevChrome.headerHtml ?? null,
        },
      },
    },
  });

  console.log("Updated digitalgate chrome.footerHtml");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
