/**
 * Shared Website Studio pricing HTML patch.
 * Link-wraps app names and locks Prospecting as a $99 Growth App.
 * Does not change prices or packaging.
 *
 * @param {string} html
 * @returns {string}
 */
export function patchPricingAppsSection(html) {
  let out = html;

  // Lock: Prospecting & Opportunity Engine = +$99/mo Growth App (not Early Access-only).
  const prospectingCard =
    /<div class="dg-app-card"[^>]*>\s*(?:<span class="app-badge[^"]*">Early Access<\/span>\s*)?<div class="app-icon">[^<]*<\/div>\s*<div class="app-name">(?:<a[^>]*>)?Prospecting &amp; Opportunity Engine(?:<\/a>)?<\/div>\s*<div class="app-price">[^<]*<\/div>[\s\S]*?<\/div>\s*(?=<div class="dg-app-card"|<\/div>\s*<\/div>\s*<\/div>\s*<\/section>)/;

  const prospectingReplacement = `<div class="dg-app-card" data-dg-stripe="premium-prospecting">
            <div class="app-icon">◎</div>
            <div class="app-name"><a href="/prospecting/">Prospecting &amp; Opportunity Engine</a></div>
            <div class="app-price">+$99<span>/mo</span></div>
            <div class="app-desc">Find businesses → discovery → opportunity score → pipeline → CRM — one Growth App</div>
            <a href="https://digitalgate.com.au/founding-customers/" class="btn-app"><span class="dg-ic dg-ic-plus" aria-hidden="true"></span> Add App</a>
          </div>
          `;

  if (prospectingCard.test(out)) {
    out = out.replace(prospectingCard, prospectingReplacement);
  } else {
    out = out.replace(
      /(Prospecting &amp; Opportunity Engine(?:<\/a>)?<\/div>\s*<div class="app-price">)Early Access(<\/div>)/,
      "$1+$99<span>/mo</span>$2",
    );
    out = out.replace(
      /(<div class="dg-app-card"[^>]*>\s*)<span class="app-badge[^"]*">Early Access<\/span>(\s*<div class="app-icon">[^<]*<\/div>\s*<div class="app-name">(?:<a[^>]*>)?Prospecting)/,
      "$1$2",
    );
  }

  if (!out.includes("Explore the Apps hub")) {
    out = out.replace(
      /<p>An operating platform with Apps — not an App marketplace\. Add only what you need\.<\/p>/,
      `<p>An operating platform with Apps — not an App marketplace. Add only what you need. <a href="/apps/" style="color:#93C5FD;font-weight:600;">Explore the Apps hub →</a></p>`,
    );
  }
  const nameLink = (name, href) =>
    out.includes(`href="${href}"`)
      ? out
      : out.replace(
          new RegExp(`<div class="app-name">${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<\\/div>`, "g"),
          `<div class="app-name"><a href="${href}">${name}</a></div>`,
        );
  const links = [
    ["CRM", "/apps/core/crm/"],
    ["Contacts", "/apps/core/contacts/"],
    ["Opportunities", "/apps/core/opportunities/"],
    ["Tasks", "/apps/core/tasks/"],
    ["Calendar", "/apps/core/calendar/"],
    ["Documents", "/apps/core/documents/"],
    ["Communications", "/apps/core/communications/"],
    ["Commerce", "/apps/core/commerce/"],
    ["Website connection &amp; management", "/apps/infrastructure/website/"],
    ["Website Builder", "/apps/infrastructure/website-builder/"],
    ["Domains", "/apps/infrastructure/domains/"],
    ["DNS", "/apps/infrastructure/dns/"],
    ["Hosting", "/apps/infrastructure/hosting/"],
    ["Email", "/apps/infrastructure/email/"],
    ["SSL", "/apps/infrastructure/ssl/"],
    ["Backups", "/apps/infrastructure/backups/"],
    ["Cloudflare", "/apps/infrastructure/cloudflare/"],
    ["Property", "/apps/industry/property/"],
    ["Hospitality &amp; Accommodation", "/apps/industry/hospitality-accommodation/"],
    ["Real Estate", "/apps/industry/real-estate/"],
    ["Accommodation", "/apps/industry/accommodation/"],
    ["Services", "/apps/industry/services/"],
    ["Finance", "/apps/industry/finance/"],
    ["Automotive", "/apps/industry/automotive/"],
    ["Creator &amp; Media", "/apps/industry/creator/"],
    ["Creator", "/apps/industry/creator/"],
    ["Prospecting &amp; Opportunity Engine", "/prospecting/"],
    ["AI Visibility", "/ai-visibility/"],
    ["SEO", "/seo/"],
    ["Automation", "/automation/"],
    ["Analytics", "/analytics/"],
    ["Social", "/social/"],
    ["Reputation", "/reputation/"],
    ["AI Communications", "/ai-communications/"],
  ];
  for (const [name, href] of links) out = nameLink(name, href);
  if (!out.includes(".dg-app-card .app-name a")) {
    out = out.replace(
      /\.dg-app-card \.btn-app:hover \{ border-color: #3B82F6;/,
      `.dg-app-card .app-name a { color: inherit; text-decoration: none; }\n    .dg-app-card .app-name a:hover { color: #93C5FD; }\n    .dg-app-card .btn-app:hover { border-color: #3B82F6;`,
    );
  }
  return out;
}
