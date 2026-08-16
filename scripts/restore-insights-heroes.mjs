/**
 * Restore Insights page heroes + fix post links / scroll-friendly status.
 * Targets Roe Realty, CVH, DigitalGate.
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

config({ path: ".env.local" });
const prisma = new PrismaClient();

function cid(prefix = "c") {
  return `${prefix}${Date.now().toString(36)}${randomBytes(3).toString("hex")}`;
}

function cleanHref(href) {
  if (!href || typeof href !== "string") return href;
  let h = href.trim();
  // Strip studio preview paths → public paths
  h = h.replace(/^\/sites\/[^/]+(?=\/)/, "");
  h = h.replace(/\?preview=1\b/g, "");
  h = h.replace(/&preview=1\b/g, "");
  if (!h.startsWith("http") && !h.startsWith("/")) h = `/${h}`;
  return h || "/";
}

function fixPostGrid(component) {
  if (!component || component.type !== "post_grid") return component;
  const posts = Array.isArray(component.props?.posts)
    ? component.props.posts.map((p) =>
        p && typeof p === "object"
          ? { ...p, href: cleanHref(p.href) }
          : p,
      )
    : [];
  return {
    ...component,
    props: {
      ...component.props,
      posts,
      headline: component.props?.headline || "Latest articles",
      columns: component.props?.columns || 2,
    },
  };
}

const HEROES = {
  cmskwz6zv0001l404cfi1wal4: {
    brand: "DigitalGate",
    html: `<style>
.dg-insights-hero{font-family:Inter,system-ui,sans-serif;background:linear-gradient(180deg,#05070A 0%,#0A0E17 100%);color:#F9FAFB;text-align:center;padding:6.5rem clamp(1rem,4vw,2rem) 3.25rem;box-sizing:border-box}
.dg-insights-hero *{box-sizing:border-box}
.dg-insights-hero .sub{display:inline-block;font-size:.68rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#93C5FD;margin-bottom:.75rem}
.dg-insights-hero h1{margin:0 0 .85rem;font-size:clamp(2rem,4.5vw,3rem);font-weight:800;line-height:1.12;letter-spacing:-.02em;color:#F9FAFB}
.dg-insights-hero h1 .accent{color:#BFDBFE}
.dg-insights-hero .lead{margin:0 auto .85rem;max-width:780px;color:#CBD5E1;font-size:1.05rem;line-height:1.7}
.dg-insights-hero .lead-sm{margin:0 auto 1.5rem;max-width:720px;color:#94A3B8;font-size:.95rem;line-height:1.7}
.dg-insights-hero .actions{display:flex;flex-wrap:wrap;gap:.55rem;justify-content:center}
.dg-insights-hero a{display:inline-flex;align-items:center;padding:.85rem 1.5rem;border-radius:999px;font-weight:700;font-size:.9rem;text-decoration:none}
.dg-insights-hero .btn-primary{background:linear-gradient(105deg,#3B82F6,#2563EB);color:#fff!important}
.dg-insights-hero .btn-secondary{background:rgba(30,41,59,.9);border:1px solid #334155;color:#E2E8F0!important}
@media(max-width:640px){.dg-insights-hero{padding-top:5.25rem}}
</style>
<section class="dg-insights-hero">
  <span class="sub">DigitalGate Insights</span>
  <h1>AI, Search, Automation &amp; the <span class="accent">Future of Connected Business</span></h1>
  <p class="lead">Practical education on AI, search, automation and business technology from the team building the Business Operating Platform.</p>
  <p class="lead-sm">Platform-first framing for businesses navigating a world where websites, search, AI, customers and workflows increasingly connect.</p>
  <div class="actions">
    <a class="btn-primary" href="/">Explore DigitalGate →</a>
    <a class="btn-secondary" href="/founding-customers">Become a Founding Customer →</a>
    <a class="btn-secondary" href="/strategy-session">Book Platform Consultation →</a>
  </div>
</section>`,
  },
  cmst2cykf000r09gj6rhixvii: {
    brand: "Roe Realty",
    html: `<style>
.rr-insights-hero{font-family:Georgia,"Times New Roman",serif;background:linear-gradient(105deg,rgba(28,43,42,.92),rgba(15,26,24,.88)),#1C2B2A;color:#F8FAFC;text-align:center;padding:6.75rem clamp(1rem,4vw,2.5rem) 3.5rem;box-sizing:border-box}
.rr-insights-hero *{box-sizing:border-box}
.rr-insights-hero .sub{display:inline-block;font-family:"Source Sans 3",system-ui,sans-serif;font-size:.72rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#C9A46C;margin-bottom:.85rem}
.rr-insights-hero h1{margin:0 auto .9rem;max-width:18ch;font-size:clamp(2.1rem,5vw,3.2rem);font-weight:700;line-height:1.12;color:#F8FAFC}
.rr-insights-hero .lead{margin:0 auto 1.5rem;max-width:640px;font-family:"Source Sans 3",system-ui,sans-serif;font-size:1.05rem;line-height:1.7;color:#E8EDEC}
.rr-insights-hero a{display:inline-flex;align-items:center;font-family:"Source Sans 3",system-ui,sans-serif;background:#C9A46C;color:#F8FAFC!important;font-weight:700;text-decoration:none;padding:.85rem 1.6rem;border-radius:40px}
@media(max-width:640px){.rr-insights-hero{padding-top:5.5rem}}
</style>
<section class="rr-insights-hero">
  <span class="sub">Roe Realty Insights</span>
  <h1>Property insights for Gold Coast sellers &amp; buyers</h1>
  <p class="lead">Local market updates, suburb guides and practical selling advice — written for homeowners who want clearer decisions and stronger outcomes.</p>
  <a href="https://report.roerealty.com.au">Get a free property report →</a>
</section>`,
  },
  cmst2d41i003509gj0nuocwqw: {
    brand: "CVH",
    html: `<style>
.cvh-insights-hero{font-family:Georgia,"Times New Roman",serif;background:linear-gradient(160deg,rgba(44,65,55,.94),rgba(28,43,42,.9)),#2C4137;color:#F8FAFC;text-align:center;padding:6.75rem clamp(1rem,4vw,2.5rem) 3.5rem;box-sizing:border-box}
.cvh-insights-hero *{box-sizing:border-box}
.cvh-insights-hero .sub{display:inline-block;font-family:"Source Sans 3",system-ui,sans-serif;font-size:.72rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#B9A48A;margin-bottom:.85rem}
.cvh-insights-hero h1{margin:0 auto .9rem;max-width:18ch;font-size:clamp(2.1rem,5vw,3.1rem);font-weight:700;line-height:1.12;color:#F8FAFC}
.cvh-insights-hero .lead{margin:0 auto 1.5rem;max-width:640px;font-family:"Source Sans 3",system-ui,sans-serif;font-size:1.05rem;line-height:1.7;color:#E8EDEC}
.cvh-insights-hero a{display:inline-flex;align-items:center;font-family:"Source Sans 3",system-ui,sans-serif;background:#B9A48A;color:#F8FAFC!important;font-weight:700;text-decoration:none;padding:.85rem 1.6rem;border-radius:40px}
@media(max-width:640px){.cvh-insights-hero{padding-top:5.5rem}}
</style>
<section class="cvh-insights-hero">
  <span class="sub">Currumbin Valley Hideaway</span>
  <h1>Valley stories, local guides &amp; stay inspiration</h1>
  <p class="lead">Explore Currumbin Valley — eco stays, rainforest escapes and the places that make this hinterland hideaway special.</p>
  <a href="/stay">Browse stays →</a>
</section>`,
  },
};

async function main() {
  const summary = [];
  for (const [websiteId, hero] of Object.entries(HEROES)) {
    const page = await prisma.websitePage.findFirst({
      where: { websiteId, slug: "insights" },
      select: { id: true, status: true, components: true },
    });
    if (!page) {
      summary.push({ brand: hero.brand, ok: false, reason: "missing page" });
      continue;
    }
    const existing = Array.isArray(page.components) ? page.components : [];
    const grid = fixPostGrid(
      existing.find((c) => c?.type === "post_grid") || {
        id: cid("grid"),
        type: "post_grid",
        props: { posts: [], columns: 2, headline: "Latest articles" },
      },
    );
    const heroComp = {
      id: cid("hero"),
      type: "html",
      props: { html: hero.html },
    };
    // Drop prior html heroes; keep only fresh hero + grid (+ forms if any)
    const extras = existing.filter(
      (c) => c?.type && c.type !== "html" && c.type !== "post_grid",
    );
    await prisma.websitePage.update({
      where: { id: page.id },
      data: {
        status: "published",
        components: [heroComp, grid, ...extras],
      },
    });
    summary.push({
      brand: hero.brand,
      ok: true,
      posts: Array.isArray(grid.props?.posts) ? grid.props.posts.length : 0,
      wasStatus: page.status,
    });
  }
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
