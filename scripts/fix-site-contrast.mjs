/**
 * Sitewide contrast pass for Gen 2 marketing HTML pages.
 * Rewrites low-AA muted / ink tokens inside embedded CSS + inline styles.
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });
const prisma = new PrismaClient();

const SITES = {
  // Dark shells — lift muted greys
  cmskwz6zv0001l404cfi1wal4: "dark", // DigitalGate
  cmslklx6t0001l504ncg97377: "dark", // Aëtherra
  // Cream shells — deepen washed secondary + light CTA labels
  cmst2cykf000r09gj6rhixvii: "light", // Roe Realty
  cmst2d41i003509gj0nuocwqw: "light", // CVH
};

const DARK_REPLACEMENTS = [
  // slate-400 / slate-500 on near-black — too soft for body copy
  [/color:\s*#94A3B8\b/gi, "color: #CBD5E1"],
  [/color:\s*#64748B\b/gi, "color: #94A3B8"],
  [/color:\s*#78716C\b/gi, "color: #A8A29E"],
  [/color:\s*#71717A\b/gi, "color: #A1A1AA"],
  // Aëtherra sage muted
  [/color:\s*#AEB8A6\b/gi, "color: #C8D0BC"],
  [/color:\s*#9AA394\b/gi, "color: #C8D0BC"],
];

const LIGHT_REPLACEMENTS = [
  // washed secondary on cream
  [/color:\s*#5A6B67\b/gi, "color: #3F4A48"],
  [/color:\s*#8A9B98\b/gi, "color: #3F4A48"],
  [/color:\s*#8FA3A0\b/gi, "color: #3F4A48"],
  [/color:\s*#6B7280\b/gi, "color: #3F4A48"],
  [/color:\s*#9CA3AF\b/gi, "color: #4B5563"],
  [/color:\s*#94A3B8\b/gi, "color: #475569"],
  // gold / sandstone fills should keep light labels
  [/(background(?:-color)?:\s*#C9A46C;[^}{;]*color:)\s*#0[Ff]1716\b/gi, "$1#F8FAFC"],
  [/(background(?:-color)?:\s*#C9A46C;[^}{;]*color:)\s*#1[Cc]2[Bb]2[Aa]\b/gi, "$1#F8FAFC"],
  [/(background(?:-color)?:\s*#C9A46C;[^}{;]*color:)\s*#2[Ff]2[Ff]2[Ff]\b/gi, "$1#F8FAFC"],
  [/(background(?:-color)?:\s*#B9A48A;[^}{;]*color:)\s*#0[Ff]1716\b/gi, "$1#F8FAFC"],
  [/(background(?:-color)?:\s*#B9A48A;[^}{;]*color:)\s*#1[Cc]2[Bb]2[Aa]\b/gi, "$1#F8FAFC"],
  [/(background(?:-color)?:\s*#B9A48A;[^}{;]*color:)\s*#2[Ff]2[Ff]2[Ff]\b/gi, "$1#F8FAFC"],
  [/(color:)\s*#0[Ff]1716(;\s*[^}]*background(?:-color)?:\s*#(?:C9A46C|B9A48A))/gi, "$1#F8FAFC$2"],
];

function rewrite(html, mode) {
  const list = mode === "dark" ? DARK_REPLACEMENTS : LIGHT_REPLACEMENTS;
  let next = html;
  let hits = 0;
  for (const [re, to] of list) {
    const before = next;
    next = next.replace(re, to);
    if (next !== before) {
      const m = before.match(re);
      hits += m ? m.length : 1;
    }
  }
  return { html: next, hits };
}

async function main() {
  const summary = [];
  for (const [websiteId, mode] of Object.entries(SITES)) {
    const pages = await prisma.websitePage.findMany({
      where: { websiteId },
      select: { id: true, slug: true, components: true },
    });
    let pagesUpdated = 0;
    let totalHits = 0;
    for (const page of pages) {
      let changed = false;
      let pageHits = 0;
      const nextComponents = (page.components || []).map((c) => {
        if (c.type !== "html" || typeof c.props?.html !== "string") return c;
        const { html, hits } = rewrite(c.props.html, mode);
        if (html !== c.props.html) {
          changed = true;
          pageHits += hits;
          return { ...c, props: { ...c.props, html } };
        }
        return c;
      });
      if (changed) {
        await prisma.websitePage.update({
          where: { id: page.id },
          data: { components: nextComponents },
        });
        pagesUpdated += 1;
        totalHits += pageHits;
      }
    }
    summary.push({ websiteId, mode, pagesUpdated, totalHits, pages: pages.length });
  }
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
