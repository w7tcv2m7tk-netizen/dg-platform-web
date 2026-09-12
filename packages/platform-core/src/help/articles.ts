/** Customer-facing Knowledge Base for current DigitalGate workflows. */

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
  connectors: "Connections & migration",
  crm: "CRM",
  apps: "Apps & workflows",
  honesty: "Scores & scope",
};

export const HELP_CATEGORY_ORDER: HelpArticleCategory[] = [
  "getting-started",
  "crm",
  "apps",
  "billing",
  "connectors",
  "honesty",
];

export interface HelpArticle {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: HelpArticleCategory;
  body: string;
}

export const HELP_ARTICLES: readonly HelpArticle[] = [
  {
    id: "signup-org",
    slug: "signup-and-organisation",
    title: "Sign up and create your organisation",
    summary: "Create your DigitalGate account, add your business, and complete the first setup steps.",
    category: "getting-started",
    body: `## Start here

1. Create or sign in to your DigitalGate account.
2. Create your business organisation when prompted.
3. Complete the guided onboarding and Business Profile.
4. Open **Overview** to see the next actions for your organisation.

## Multiple businesses

One account can belong to more than one organisation. Use the organisation switcher to move between businesses; each organisation keeps its own data, apps, settings and team access.

## Add your team

Owners and administrators can manage people from **Settings → Team**.

## Next

- [Complete your Business Profile](/support/help/business-profile)
- [Open Overview](/dashboard)
- [Get help](/support/help/getting-help)
`,
  },
  {
    id: "business-profile",
    slug: "business-profile",
    title: "Complete your Business Profile",
    summary: "Keep the business identity, services, audience and brand information used across DigitalGate up to date.",
    category: "getting-started",
    body: `## Why it matters

Business Profile is shared context for DigitalGate. Your website, AI guidance, visibility tools and other apps use it so you do not have to maintain a different business description in every module.

## What to complete

1. Open **Dashboard → Business**.
2. Confirm your business and trading names, ABN where relevant, website and contact details.
3. Add your services or products, target customers and key differentiators.
4. Add your logo and brand details where available.
5. Save your changes and return to Overview.

## Keep it current

Update the profile when your offer, service area or business priorities change. Better source information gives the Business Brain and customer-facing apps better context.
`,
  },
  {
    id: "getting-help",
    slug: "getting-help",
    title: "Getting help",
    summary: "Use the Knowledge Base first, then continue with DigitalGate Support when you need a person.",
    category: "getting-started",
    body: `## Best path

1. Check the relevant Knowledge Base article.
2. Open **Support** from DigitalGate if the issue is still unresolved.
3. Or email **support@digitalgate.com.au**.

## Help us reproduce the issue

Include your organisation name, the page you were using, what you expected to happen and what happened instead. A screenshot is useful when the issue is visual.

Do not include passwords, API secrets or payment card details in a support message.
`,
  },
  {
    id: "crm-contacts-opportunities",
    slug: "crm-contacts-and-opportunities",
    title: "CRM contacts and opportunities",
    summary: "Use shared contacts, activity and opportunities as the customer relationship foundation across DigitalGate.",
    category: "crm",
    body: `## Contacts

- Open **CRM → Contacts** to add or review people and organisations you work with.
- A contact is shared across the apps that need that relationship, rather than being copied into separate databases.
- Open a contact to review the activity timeline and related work.

## Opportunities

Use **CRM → Opportunities** for sales or relationship work that is not already represented by a specialised industry workflow.

Industry apps can use the same CRM contacts while keeping their own purpose-built stages and records.

## Good first step

Add one real contact and record the next action. It gives Tasks, Communications, Commerce and industry apps useful relationship context immediately.
`,
  },
  {
    id: "tasks",
    slug: "tasks",
    title: "Tasks and follow-up",
    summary: "Keep next actions inside DigitalGate so follow-up is visible and accountable.",
    category: "crm",
    body: `## Use Tasks for work that needs a next action

Create tasks from the relevant CRM, opportunity or workflow context where available. Give the task a clear outcome, owner and due date.

## Working the list

- Review due and overdue work regularly.
- Complete tasks when the action is finished rather than using completion as a reminder dismissal.
- Open the related contact, opportunity or app record when you need the surrounding context.

If you cannot create or complete a task you should have access to, contact Support with the page URL and your organisation name.
`,
  },
  {
    id: "automation-defaults",
    slug: "automation-defaults",
    title: "Automation basics",
    summary: "Use DigitalGate automation to connect real triggers and actions without losing human control.",
    category: "apps",
    body: `## Start small

1. Open **Automation** for your organisation.
2. Choose a trigger that represents a real business event.
3. Add the action you want DigitalGate to take.
4. Review the workflow before enabling it.

Good first automations are simple and observable: create a task, send an internal notification, update a stage, or start a defined follow-up path.

## Keep responsibility clear

Automation should reduce repeat work, not make important customer decisions invisible. Review workflows whenever your sales, service or compliance process changes.
`,
  },
  {
    id: "real-estate",
    slug: "real-estate-workflow",
    title: "Real Estate workflow",
    summary: "Run vendor and buyer work from lead through property, listing, offer and settlement in the native Real Estate app.",
    category: "apps",
    body: `## Vendor workflow

1. Open **Real Estate → Vendor Leads** and add or review a vendor lead.
2. Progress the relationship through appraisal and property preparation.
3. Create or open the property record.
4. Manage listing details and approved syndication channels.
5. Record offers and progress the accepted deal through settlement.

## Buyer workflow

Use **Buyer Leads** for buyer enquiries and follow-up. Buyer and vendor records link back to your shared CRM contacts so the relationship history stays together.

## Permissions

People with read access can review the pipeline. Organisation-wide Real Estate edit authority is required for property, listing, booking and pipeline mutations.
`,
  },
  {
    id: "accommodation",
    slug: "accommodation-workflow",
    title: "Accommodation workflow",
    summary: "Manage units, availability, stays, check-ins, housekeeping and payments from the native Accommodation app.",
    category: "apps",
    body: `## Set up the property

1. Open **Accommodation → Units** and confirm the accommodation units you manage.
2. Review **Availability** and booking rules.
3. Use **Bookings** for stays and guest details.
4. Work upcoming arrivals from **Check-ins**.
5. Use **Housekeeping** for turnover work.
6. Review **Payments** for accommodation payment state.

Dates and times follow your organisation timezone. Money presentation follows the organisation locale and currency.

If you are moving historical information from another system, use an explicit migration/import workflow rather than treating the old system as the live data source.
`,
  },
  {
    id: "services",
    slug: "services-workflow",
    title: "Services jobs and scheduling",
    summary: "Create service jobs, schedule work, track stages and keep field activity connected to CRM customers.",
    category: "apps",
    body: `## Typical flow

1. Open **Services → Jobs** and create the job.
2. Link the customer and assign the appropriate team member where required.
3. Schedule the work using the organisation's local time.
4. Update the job stage as work progresses.
5. Use notes, checklist items and approved attachments to keep the job record useful.

Service templates change organisation-wide workflow configuration, so they require management authority rather than ordinary job-edit access.
`,
  },
  {
    id: "finance",
    slug: "finance-workflow",
    title: "Finance applications and pipeline",
    summary: "Track borrowers and finance applications through a clear native pipeline linked to CRM contacts.",
    category: "apps",
    body: `## Typical flow

1. Open **Finance → Applications** and create an application.
2. Link the relevant CRM client where appropriate.
3. Enter the requested amount and application details.
4. Progress the application through the pipeline stages as the deal moves forward.
5. Use **Clients** to return to the shared CRM relationship context.

Application changes require organisation-wide Finance edit authority. Read-only team members can review the pipeline without being shown mutation controls they cannot use.
`,
  },
  {
    id: "billing-checkout-portal",
    slug: "billing-checkout-and-portal",
    title: "Billing and subscription management",
    summary: "Review your DigitalGate subscription, payment state and billing options from Settings.",
    category: "billing",
    body: `## Manage billing

Open **Settings → Billing** to review the organisation's plan and available billing actions.

Owners and administrators can use the available checkout or billing-portal actions when a subscription or payment method needs attention. Ordinary members should ask an organisation owner or administrator to make commercial changes.

## After payment

DigitalGate updates subscription and entitlement state from the payment provider. If a completed payment does not appear correctly, do not pay again blindly—contact Support with the organisation name and approximate payment time so the transaction can be checked.
`,
  },
  {
    id: "connections",
    slug: "connections-and-imports",
    title: "Connections and imports",
    summary: "Connect supported services deliberately and use migration tools when moving data into DigitalGate.",
    category: "connectors",
    body: `## Connections

Use **Settings → Connected Services** or the relevant app's connection screen for supported external services. Each connection should have a clear purpose and scope.

## Migration is different from live authority

When DigitalGate offers an import from a previous website or system, treat it as a migration step: bring the required data into Platform Core, review it, then continue operating in DigitalGate.

A historical system should not silently become the fallback source for normal Gen 2 operation.

If you are unsure whether a connection is an ongoing integration or a one-time import, contact Support before relying on it operationally.
`,
  },
  {
    id: "websites",
    slug: "websites-and-publishing",
    title: "Websites and publishing",
    summary: "Create, edit, preview and publish a native DigitalGate website, then connect its domain.",
    category: "apps",
    body: `## Create and publish

1. Complete your **Business Profile** so the site starts with useful business context.
2. Open **Websites** and create or select the site.
3. Edit content, design and SEO settings in Design Studio.
4. Preview before publishing.
5. Publish the site when it is ready.
6. Use **Infrastructure → Domains** to connect the live domain where required.

If you are migrating content from an older site, use the explicit import option available in the website workflow. Importing content does not make the old website the runtime data authority.
`,
  },
  {
    id: "ai-visibility-honesty",
    slug: "ai-visibility-honesty",
    title: "AI Visibility — what the score means",
    summary: "Understand what DigitalGate can observe and what it does not infer when assessing AI visibility readiness.",
    category: "honesty",
    body: `## What the score uses

AI Visibility and SEO use observable website and technical signals, such as structured data, metadata and other presence checks available to DigitalGate.

## What the score does not invent

DigitalGate does not present fabricated citation positions, keyword rankings or hard-coded demonstration scores as live measurements.

## Improve the result

1. Confirm the correct website URL in Business Profile.
2. Run the available audit.
3. Work through the findings in priority order.
4. Re-run the audit after meaningful website changes.

When a required source is missing, the platform should show the missing input or recovery path rather than a decorative score.
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
