/**
 * Restore DigitalGate site chrome header from marketing/pages/header.html
 * Usage: npx dotenv -e .env.local -- node scripts/restore-dg-header-chrome.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

import { prepareMarketingChromeHtml } from "../src/lib/public-html.ts";

config({ path: ".env.local" });

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const headerPath = resolve(root, "../dg-platform/marketing/pages/header.html");

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL missing");
    process.exit(1);
  }
  if (!existsSync(headerPath)) {
    console.error("Missing", headerPath);
    process.exit(1);
  }

  const raw = readFileSync(headerPath, "utf8");
  const headerHtml = prepareMarketingChromeHtml(raw);
  const hasHeaderTag = /<header\b[^>]*class=["'][^"']*dg-header/i.test(headerHtml);
  console.log("Prepared header", headerHtml.length, "chars", "hasDgHeader=", hasHeaderTag);
  if (!hasHeaderTag) {
    console.error("Refusing to publish header chrome without <header class=\"dg-header\">");
    process.exit(1);
  }

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const site = await prisma.website.findUnique({ where: { slug: "digitalgate" } });
  if (!site) {
    console.error("Website slug=digitalgate not found");
    await prisma.$disconnect();
    process.exit(1);
  }

  const prev =
    site.metadata && typeof site.metadata === "object" ? site.metadata : {};
  const prevChrome =
    prev.chrome && typeof prev.chrome === "object" ? prev.chrome : {};

  await prisma.website.update({
    where: { id: site.id },
    data: {
      metadata: {
        ...prev,
        chrome: {
          ...prevChrome,
          headerHtml,
          stylesheets: [
            "https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
            "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css",
            ...(Array.isArray(prevChrome.stylesheets)
              ? prevChrome.stylesheets.filter(
                  (s) =>
                    typeof s === "string" &&
                    !s.includes("fonts.googleapis.com") &&
                    !s.includes("font-awesome"),
                )
              : []),
          ],
          footerHtml: prevChrome.footerHtml ?? null,
        },
      },
    },
  });

  console.log(
    "Updated digitalgate chrome.headerHtml",
    `studio=https://app.digitalgate.com.au/apps/websites/studio/${site.id}`,
  );
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
