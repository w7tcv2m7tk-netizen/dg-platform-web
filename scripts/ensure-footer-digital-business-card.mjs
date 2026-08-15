/**
 * Ensure every website chrome footer includes a Digital Business Card link.
 * DigitalGate is restored from marketing/pages/footer.html; other brands get
 * an idempotent insert before the footer-bottom / legal block when missing.
 *
 * Usage: node scripts/ensure-footer-digital-business-card.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

config({ path: ".env.local" });

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const dgFooterPath = resolve(root, "../dg-platform/marketing/pages/footer.html");

const ICON = "https://app.digitalgate.com.au/brand/icon-light.png";
const LOGO = "https://app.digitalgate.com.au/brand/logo-on-dark.png";

const CARD_RE = /\/card\/?|Digital Business Card/i;

function prepareDgChrome(html) {
  let out = String(html || "");
  out = out
    .replace(/<!DOCTYPE[\s\S]*?<body[^>]*>/i, "")
    .replace(/<\/body>[\s\S]*$/i, "")
    .replace(/<\/?html[^>]*>/gi, "")
    .replace(/<\/?head[^>]*>/gi, "");
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

  const styleTag = `<style>
${styles.join("\n")}
.wb-chrome-root img{max-width:none;height:auto}
.wb-chrome-root .dg-full-logo,.wb-chrome-root img.dg-full-logo{height:28px!important;width:auto!important;max-width:11rem!important;object-fit:contain}
.wb-chrome-root .dg-gate-icon,.wb-chrome-root img.dg-gate-icon{width:32px!important;height:32px!important;object-fit:contain}
.wb-chrome-root .dg-logo-fallback{display:none}
</style>`;

  return `${styleTag}\n<div class="wb-chrome-root">\n${out.trim()}\n</div>`.trim();
}

function cardBlock(href = "/card/") {
  return `<div class="card-link dg-card-link">
  <a href="${href}">
    <i class="fas fa-id-card"></i> Digital Business Card
  </a>
</div>`;
}

function ensureCardInFooter(html, siteSlug) {
  if (!html || !html.trim()) return { html, changed: false, reason: "empty" };
  if (CARD_RE.test(html)) return { html, changed: false, reason: "already" };

  const href =
    siteSlug === "digitalgate"
      ? "https://digitalgate.com.au/card/"
      : "/card/";
  const block = cardBlock(href);

  // Prefer insert before footer-bottom / legal strip
  const bottomRe =
    /(<div[^>]*class=["'][^"']*(?:footer-bottom|dg-footer-bottom)[^"']*["'][^>]*>)/i;
  if (bottomRe.test(html)) {
    return {
      html: html.replace(bottomRe, `${block}\n$1`),
      changed: true,
      reason: "before-bottom",
    };
  }

  // Fallback: before closing footer
  if (/<\/footer>/i.test(html)) {
    return {
      html: html.replace(/<\/footer>/i, `${block}\n</footer>`),
      changed: true,
      reason: "before-footer-close",
    };
  }

  return {
    html: `${html}\n${block}`,
    changed: true,
    reason: "appended",
  };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL missing");
    process.exit(1);
  }

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const sites = await prisma.website.findMany({
    select: { id: true, slug: true, metadata: true },
  });

  for (const site of sites) {
    const prev =
      site.metadata && typeof site.metadata === "object" ? site.metadata : {};
    const prevChrome =
      prev.chrome && typeof prev.chrome === "object" ? prev.chrome : {};

    let footerHtml =
      typeof prevChrome.footerHtml === "string" ? prevChrome.footerHtml : "";
    let changed = false;
    let reason = "";

    if (site.slug === "digitalgate") {
      if (!existsSync(dgFooterPath)) {
        console.error("Missing", dgFooterPath);
        process.exit(1);
      }
      footerHtml = prepareDgChrome(readFileSync(dgFooterPath, "utf8"));
      changed = true;
      reason = "restored-from-source";
    } else {
      const result = ensureCardInFooter(footerHtml, site.slug);
      footerHtml = result.html;
      changed = result.changed;
      reason = result.reason;
    }

    if (!changed) {
      console.log(`${site.slug}: ok (${reason})`);
      continue;
    }

    await prisma.website.update({
      where: { id: site.id },
      data: {
        metadata: {
          ...prev,
          chrome: {
            ...prevChrome,
            footerHtml,
            headerHtml: prevChrome.headerHtml ?? null,
          },
        },
      },
    });
    console.log(
      `${site.slug}: updated (${reason}, ${footerHtml.length}c, hasCard=${CARD_RE.test(footerHtml)})`,
    );
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
