/**
 * Customer-facing Knowledge Base stubs.
 * Linked from /support/help — escalate via chat or support@digitalgate.com.au on business days.
 */

export type HelpArticleCategory =
  | "getting-started"
  | "billing"
  | "connectors"
  | "crm"
  | "apps"
  | "honesty";

export const HELP_CATEGORY_LABELS: Record<HelpArticleCategory, string> = {
  "getting-started": "Getting started",
  billing: "Billing",
  connectors: "Connectors",
  crm: "CRM",
  apps: "Apps & workflows",
  honesty: "Honest scope",
};

/** Display order for category index */
export const HELP_CATEGORY_ORDER: HelpArticleCategory[] = [
  "getting-started",
  "billing",
  "connectors",
  "crm",
  "apps",
  "honesty",
];

export interface HelpArticle {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: HelpArticleCategory;
  /** Markdown-ish body rendered by SafeMarkdown */
  body: string;
}

export const HELP_ARTICLES: readonly HelpArticle[] = [
  {
    id: "signup-org",
    slug: "signup-and-organisation",
    title: "Sign up and create your organisation",
    summary:
      "Create a Clerk account, add a business, and land on the DigitalGate shell for that org.",
    category: "getting-started",
    body: `## What you do

1. Sign up at the DigitalGate app (Clerk).
2. Use **Add business** in the org switcher — name the organisation and pick a template if offered (e.g. Real Estate).
3. You land on Overview / Business Profile for that org.

## What to expect

- One login can belong to multiple organisations.
- Invites for teammates happen later under **Settings → Team**.
- If something fails mid-signup, use **Support** chat or email — do not assume a silent staff ticket was opened.

## Next

- [Business Profile](/support/help/business-profile)
- [Team roles](/dashboard/settings/team) (in-app)
`,
  },
  {
    id: "business-profile",
    slug: "business-profile",
    title: "Business Profile",
    summary:
      "ABN, brand, website URL, and identity fields that feed CRM, Websites, SEO, and AI Visibility.",
    category: "getting-started",
    body: `## Why it matters

Business Profile is a source of truth for website URL, brand assets, and AU identity (ABN where collected). Other apps read it — they do not invent a second profile.

## Typical steps

1. Open **Dashboard → Business** (or the onboarding checklist).
2. Add legal / trading name, ABN if you have one, logo, and primary website URL.
3. Save — Overview setup progress should move forward.

## Honest limits

- Incomplete profile → SEO / AI Visibility audits may refuse to score or show a critical path instead of a decorative number.
- Industry templates (e.g. Real Estate) may add checklist steps; they do not unlock every portal or marketing promise.
`,
  },
  {
    id: "billing-checkout-portal",
    slug: "billing-checkout-and-portal",
    title: "Billing, checkout, and customer portal",
    summary:
      "How Stripe checkout, webhooks, entitlements, and the billing portal fit together for your org.",
    category: "billing",
    body: `## Path

1. **Settings → Billing** — see plan status and start checkout when offered.
2. Stripe Checkout collects payment (test mode until live keys are configured).
3. Webhooks update org entitlements — without a working webhook, payment may succeed in Stripe but the app stays on the free / unpaid path.
4. **Customer portal** (when linked) manages payment method and invoices in Stripe — DigitalGate does not host a fake invoice inbox.

## Who can change billing

**Owner / Admin** only. Members should ask an owner to update plan or payment method.

## If checkout looks stuck

Check Support on a business day with your org name and approximate time of payment. Do not re-pay blindly until someone confirms webhook status.
`,
  },
  {
    id: "connectors-wordpress",
    slug: "connectors-wordpress",
    title: "Connectors and WordPress",
    summary:
      "Per-org WordPress connector: base URL, API key, and what syncs into CRM / Real Estate.",
    category: "connectors",
    body: `## Setup

1. Open **Settings → Connectors**.
2. Enter the WordPress site base URL and platform API key from the DG Platform plugin.
3. Save and run a sync / smoke check from the connector panel.

## What WordPress is for

- Public capture (property reports, enquiries, bookings) often still lives on WordPress during closed beta.
- Contacts, leads, and listing publish paths sync when the connector is healthy.

## Honest limits

- A missing or wrong key fails closed — we do not invent a successful sync.
- Other connectors (Domain, REA, Google, Cotality) are separate panels with their own credentials and scope.
`,
  },
  {
    id: "domain-sandbox",
    slug: "domain-syndication-sandbox",
    title: "Domain.com.au syndication (sandbox honesty)",
    summary:
      "Pilots use Listings Management Sandbox via DOMAIN_API_PATH_PREFIX=/sandbox — not live Primary by default.",
    category: "connectors",
    body: `## Pilot reality

Domain syndication in DigitalGate is wired for **Listings Management**. Many pilot credentials only authorise **Sandbox** paths.

Set on the deployment (Vercel / \`.env\`):

\`\`\`
DOMAIN_API_PATH_PREFIX=/sandbox
\`\`\`

Then **Reconnect** Domain under Connectors. Without the prefix, probes hit Primary \`/v1/…\` and often return **403** even with a valid OAuth token.

## What “published” means

- A queue / process id is **not** the same as live on Domain.com.au.
- Sandbox may create a **test agency** — do not treat sandbox listings as public marketing.

## In the UI

Property Domain syndication and the Domain connector panel both surface the sandbox prefix note when relevant.
`,
  },
  {
    id: "re-closed-beta",
    slug: "real-estate-closed-beta",
    title: "Real Estate closed beta — what’s in and out",
    summary:
      "Vendor/buyer pipelines, appraisals, listings, offers, settlements — and what we do not promise yet.",
    category: "honesty",
    body: `## In (typical pilot)

- Org with **Real Estate** template / \`re.beta\` flag
- Business Profile + WordPress connector
- Vendor & buyer pipelines, appraisals, properties, listings, offers, settlements
- Contact roles as **tags** (Vendor / Buyer) on Contact
- Optional Commerce on leads

## Out (do not promise)

- Full portal syndication as a guaranteed beta deliverable (Domain/REA are scaffold / sandbox paths)
- Full marketing campaigns / Network Marketplace
- Multi-office franchise hierarchy
- Mobile-native agent apps beyond the web/PWA shell
- AI auto-execute listing copy at scale

## Flag

\`re.beta\` gates sidebar and \`/apps/re/*\`. Staff can enable via Command Centre for an existing org.
`,
  },
  {
    id: "crm-contacts-opportunities",
    slug: "crm-contacts-and-opportunities",
    title: "CRM contacts and opportunities",
    summary:
      "Contacts as the shared object; opportunities for pipeline work across Apps.",
    category: "crm",
    body: `## Contacts

- Create manually under **CRM → Contacts**, or wait for WordPress / connector sync.
- Open a contact for the unified activity timeline — Apps write here.
- Industry tags (e.g. Vendor / Buyer) attach to the same person object.

## Opportunities

- Use **CRM → Opportunities** for deal-shaped work that is not industry-specific lead stages.
- Real Estate vendor/buyer leads live under the RE app when \`re.beta\` is on — they still resolve to contacts.

## Tip

Start with one real contact before enabling more Growth Apps. Empty CRM makes every downstream screen look broken.
`,
  },
  {
    id: "tasks",
    slug: "tasks",
    title: "Tasks",
    summary:
      "Follow-through tasks on the CRM path so work does not depend on Ben chasing people.",
    category: "crm",
    body: `## Intent

Tasks exist so pilots can assign and complete follow-ups inside DigitalGate — not in a side spreadsheet.

## Where to look

- CRM contact / opportunity surfaces and Command ops pulse (due today) when enabled.
- If a Tasks list route is empty, treat it as **not yet provisioned for your org**, not as zero work globally.

## Escalate

If you cannot create or complete a task that the pilot promised, use Support chat or email on a business day with the org name and screen URL.
`,
  },
  {
    id: "automation-defaults",
    slug: "automation-defaults",
    title: "Automation defaults",
    summary:
      "A small set of real durable actions — not a full marketing automation suite.",
    category: "apps",
    body: `## Honesty

Automation in commercially ready v1 is a **narrow** registry of triggers and actions on the founding path — not “set and forget” campaigns across every channel.

## What to do

1. Open **Automation** for your org.
2. Review enabled defaults / available actions.
3. Prefer 2–3 durable actions you will actually run (e.g. notify, create task, update stage) over speculative chains.

## Out of scope for stubs

- Guaranteeing every Marketing app tile is live automation
- Silent AI that emails customers without an owner approving the path
`,
  },
  {
    id: "ai-visibility-honesty",
    slug: "ai-visibility-honesty",
    title: "AI Visibility — what scores mean",
    summary:
      "Presence / technical probes only — no invented ChatGPT citation ranks or decorative demo scores.",
    category: "honesty",
    body: `## Principle

**AI Visibility** and **SEO** share one presence audit. Scores reflect observable HTML (and optional Studio checks). They do **not** invent:

- ChatGPT / Gemini / Perplexity / Copilot citation ranks
- Keyword SERP positions
- Hardcoded demo scores

## How to run

1. Set a website URL on Business Profile.
2. Run an audit from SEO or AI Visibility.
3. Read findings and the shared score — if URL is missing, expect a critical path, not a fake number.

## “Monitoring ChatGPT”

Out of scope for this slice. If a vendor claims live LLM citation tracking inside DigitalGate today, that claim is wrong.
`,
  },
  {
    id: "getting-help",
    slug: "getting-help",
    title: "Getting help (chat and email)",
    summary:
      "Use Knowledge Base first; escalate via in-app chat or support@digitalgate.com.au on business days.",
    category: "getting-started",
    body: `## Escalate path

1. Search this Knowledge Base for the topic.
2. Use **in-app Support chat** for a live thread with the DigitalGate team.
3. Or email **support@digitalgate.com.au** — responses on **business days** (Australia).

## What we do not claim

- A 24/7 staffed ticket portal with SLAs
- That every chat auto-creates a separate “support inbox product” you can browse like Zendesk

Chat and email are the escalate path. Keep context (org name, URL, screenshot) so we can help without reconstructing your session from scratch.
`,
  },
];

export function getHelpArticleBySlug(slug: string): HelpArticle | undefined {
  return HELP_ARTICLES.find((article) => article.slug === slug);
}

export function listHelpArticlesByCategory(
  category: HelpArticleCategory,
): HelpArticle[] {
  return HELP_ARTICLES.filter((article) => article.category === category);
}

export function listHelpCategoriesWithArticles(): Array<{
  category: HelpArticleCategory;
  label: string;
  articles: HelpArticle[];
}> {
  return HELP_CATEGORY_ORDER.map((category) => ({
    category,
    label: HELP_CATEGORY_LABELS[category],
    articles: listHelpArticlesByCategory(category),
  })).filter((group) => group.articles.length > 0);
}
