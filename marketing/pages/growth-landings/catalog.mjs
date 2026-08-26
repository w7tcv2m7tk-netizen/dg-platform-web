/**
 * Growth SEO landing pages — canonical URLs (/seo, /growth, …).
 * Commercial truth (badge, status, pricing) derived from apps/catalog.mjs.
 */
import { appBySlug, appsInLayer, LAYERS } from "../apps/catalog.mjs";

export const SITE = "https://digitalgate.com.au";
export const GROWTH_LAYER = LAYERS.find((l) => l.id === "growth");

/** Pricing text from catalog — never hard-code independently. */
export function commercialFromApp(appSlug) {
  const app = appBySlug(appSlug);
  if (!app) return { badge: "Growth App", pricing: "See Pricing.", status: "" };
  return {
    badge: app.badge,
    pricing:
      app.pricing ||
      (app.badge === "Free"
        ? "Free Growth App — no separate charge."
        : "Optional Growth App — see Apps & pricing."),
    status: app.status,
    appName: app.name,
    depth: app.depth,
  };
}

export const INSIGHT_LINKS = [
  {
    href: "/from-dumb-businesses-to-smart-businesses/",
    label: "Why AI needs a connected business",
    kicker: "Foundational series · Part 1",
  },
  {
    href: "/intelligent-business-more-than-a-brain/",
    label: "The intelligent business is more than a brain",
    kicker: "Foundational series · Part 2",
  },
];

export const GROWTH_HUB = {
  slug: "growth",
  seoTitle: "Growth Apps | SEO, AI Visibility, Automation & More | DigitalGate",
  metaDescription:
    "DigitalGate Growth capabilities — SEO, AI Visibility, Automation, Analytics, Social, Reputation, Prospecting and AI Communications — connected to Core, Industry and Intelligence.",
  h1: "Make your business more visible, discoverable and effective",
  lead:
    "Growth is not a pile of unrelated SaaS tools. It is the layer of DigitalGate that helps a connected business be found, understood, measured and followed through — on the same platform as CRM, Communications and Intelligence.",
};

function L(appSlug, partial) {
  const c = commercialFromApp(appSlug);
  return { appSlug, ...c, ...partial };
}

export const GROWTH_LANDINGS = [
  L("seo", {
    slug: "seo",
    seoTitle: "SEO Platform for Connected Businesses | DigitalGate",
    metaDescription:
      "SEO auditing, technical signals, on-page guidance and monitoring on the platform that owns your website — connected to AI Visibility, Analytics and Core.",
    keywords: [
      "SEO platform",
      "SEO software Australia",
      "technical SEO",
      "business SEO",
      "connected SEO",
    ],
    h1: "SEO for the connected business",
    heroLead:
      "Technical and content truth from the live site you already run on DigitalGate — not an agency retainer or a disconnected audit PDF.",
    positioning:
      "Search-optimised presence works best when SEO shares context with CRM, Communications, Analytics and AI Visibility on one operating platform.",
    problem: {
      title: "SEO tools that never talk to the business",
      body: "Most businesses run SEO in a separate tool or through an agency. Audits arrive as reports. Fixes live in spreadsheets. Nobody connects ranking issues to open opportunities, customer conversations or what the website actually publishes today.",
      bullets: [
        "Audits disconnected from the live website",
        "Recommendations that never become tasks",
        "No shared context with CRM or growth workflows",
        "Agency deliverables that decay the moment the retainer ends",
      ],
    },
    approach: {
      title: "SEO as part of the operating system",
      body: "DigitalGate SEO reads the site connected to the platform — the same presence signals used by AI Visibility — and turns findings into understandable, actionable work inside DigitalGate.",
    },
    capabilities: [
      { title: "SEO auditing", body: "Structured audits from the connected website — technical and content signals in one place." },
      { title: "Website health", body: "Health and readiness signals alongside Infrastructure and Website connection." },
      { title: "Technical SEO", body: "Crawlability, structure, metadata and technical issues surfaced from live data." },
      { title: "On-page optimisation", body: "Page-level guidance tied to pages you manage on the platform." },
      { title: "Monitoring & re-audit", body: "Learn whether changes improved the site — not a one-off snapshot." },
      { title: "AI Visibility alignment", body: "Shared presence layer with AI Visibility — one source of truth, two jobs." },
    ],
    howItWorks: ["Site connected", "Audit run", "Issues prioritised", "Task or fix", "Publish change", "Re-audit", "Learn"],
    connected: {
      title: "The connected business advantage",
      body: "When SEO lives on DigitalGate, findings can relate to real business objects — pages, tasks, opportunities — instead of dying in email.",
      bullets: [
        "Website Connection / Builder as the source of truth",
        "Tasks and follow-through in CRM",
        "Shared signals with AI Visibility",
        "Automation for repeatable SEO workflows where configured",
      ],
    },
    intelligence: {
      title: "Intelligence layer",
      body: "Business Brain and Advisor can reason across SEO signals alongside goals and pipeline context — when that data is connected and authorised. SEO informs Understand → Decide → Act, not vanity charts alone.",
    },
    workflow: {
      title: "Example workflow",
      steps: [
        "A local services business connects its DigitalGate website.",
        "SEO audit flags missing metadata on high-traffic service pages.",
        "Advisor prioritises fixes that align with current lead generation goals.",
        "Tasks are assigned; pages are updated in Website Builder.",
        "Re-audit confirms improvement; Analytics shows traffic response.",
      ],
    },
    audience: {
      title: "Who it is for",
      bullets: [
        "Businesses whose site runs on or connects to DigitalGate",
        "Operators who want SEO inside the OS, not another subscription silo",
        "Founding customers building local and organic discovery on-platform",
      ],
    },
    faq: [
      {
        q: "Is DigitalGate an SEO agency?",
        a: "No. DigitalGate is a Business Operating Platform with SEO as a Growth App. We do not sell rankings guarantees or managed SEO retainers.",
      },
      {
        q: "How is this different from AI Visibility?",
        a: "Both read connected presence signals. SEO focuses on search optimisation and site health. AI Visibility focuses on readiness for AI search and structured understanding.",
      },
      {
        q: "What does it cost?",
        a: "SEO is an optional Growth App billed separately. See Pricing and Apps for current commercial terms.",
      },
    ],
    related: [
      { href: "/ai-visibility/", label: "AI Visibility" },
      { href: "/analytics/", label: "Analytics" },
      { href: "/automation/", label: "Automation" },
      { href: "/apps/infrastructure/website/", label: "Website (Infrastructure)" },
      { href: "/apps/growth/seo/", label: "SEO App detail →" },
    ],
  }),

  L("ai-visibility", {
    slug: "ai-visibility",
    seoTitle: "AI Visibility & AI Search Readiness | DigitalGate",
    metaDescription:
      "Measure AI and search readiness from observable website signals — schema, structure, Open Graph and technical presence. Honest scoring without invented ChatGPT rankings.",
    keywords: ["AI visibility", "AI search optimisation", "AI search readiness", "entity SEO"],
    h1: "Be understood by the next generation of search",
    heroLead:
      "AI Visibility measures what we can observe about your presence — structured data, entity signals, technical readiness — and tells you what to act on next.",
    positioning:
      "Traditional SEO and AI Visibility share connected signals on DigitalGate. They answer different questions for the same business.",
    problem: {
      title: "Visibility panic without observable truth",
      body: "Businesses hear that ChatGPT and AI search will replace Google, then buy vague “AI SEO” services with no connection to their actual website, CRM or operations.",
      bullets: [
        "Claims about AI citations without evidence",
        "Disconnection from the live website",
        "No path from score to action",
        "Duplicate work separate from SEO and Analytics",
      ],
    },
    approach: {
      title: "Honest readiness scoring",
      body: "DigitalGate AI Visibility scores observable signals from your connected presence. We do not claim live citation monitoring or invented rankings inside third-party AI engines.",
    },
    capabilities: [
      { title: "AI Visibility Score", body: "Structured readiness score from observable site and presence signals." },
      { title: "Schema & structured data", body: "Structured data coverage as part of readiness — not a checklist in isolation." },
      { title: "Open Graph & social signals", body: "How your pages present when shared and indexed." },
      { title: "Technical readiness", body: "Technical signals that affect how systems understand your business." },
      { title: "Gap recommendations", body: "Prioritised gaps that can become tasks — not a static PDF." },
      { title: "SEO relationship", body: "Shared audit layer with SEO — optimise once, measure two ways." },
    ],
    howItWorks: ["Website connected", "Signals collected", "Score calculated", "Gaps identified", "Action recommended", "Fix applied", "Re-measure"],
    connected: {
      title: "Connected Business advantage",
      body: "Visibility findings feed the same platform that holds Contacts, Opportunities and Automation — so discovery improvements can become follow-through.",
      bullets: ["Website Connection", "Prospecting presence audits", "CRM and Tasks", "Digital Twin context over time"],
    },
    intelligence: {
      title: "Intelligence layer",
      body: "Advisor can relate visibility gaps to business goals when Brain and Twin have authorised context — prioritising what matters, not every technical nit.",
    },
    workflow: {
      title: "Example workflow",
      steps: [
        "A professional services firm connects its site.",
        "AI Visibility highlights weak entity structure on key service pages.",
        "Team updates schema and on-page clarity via Website tools.",
        "Score improves; SEO audit reflects the same underlying fixes.",
        "Prospecting uses presence signals in opportunity scoring.",
      ],
    },
    audience: {
      title: "Who it is for",
      bullets: [
        "Businesses preparing for AI-influenced discovery",
        "Operators who want measurable readiness, not hype",
        "DigitalGate customers with a connected website",
      ],
    },
    faq: [
      {
        q: "Does DigitalGate track ChatGPT rankings?",
        a: "No. We measure observable website and presence signals. We do not claim live AI engine ranking or citation monitoring unless explicitly shipped and documented.",
      },
      {
        q: "Is this the same as SEO?",
        a: "Related but distinct. Both use connected presence data. SEO optimises for search; AI Visibility focuses on readiness for AI-mediated discovery.",
      },
    ],
    related: [
      { href: "/seo/", label: "SEO" },
      { href: "/prospecting/", label: "Prospecting & Opportunity Engine" },
      { href: "/insights/", label: "Insights" },
      { href: "/apps/growth/ai-visibility/", label: "AI Visibility App detail →" },
    ],
  }),

  L("automation", {
    slug: "automation",
    seoTitle: "Business Workflow Automation Platform | DigitalGate",
    metaDescription:
      "Connect triggers, CRM events, communications and payments into approved workflows on DigitalGate — not another isolated Zapier clone.",
    keywords: ["business automation", "workflow automation", "small business automation"],
    h1: "Turn repeatable processes into connected workflows",
    heroLead:
      "Automation on DigitalGate acts on Core events — leads, opportunities, payments, stays — with human approval where it matters.",
    positioning:
      "Connecting two apps is not automation. DigitalGate workflows act on business context with logs, permissions and outcomes that feed back to the platform.",
    problem: {
      title: "Integration without intelligence",
      body: "Point-to-point integrations move data but rarely understand whether an action was correct, authorised or worth repeating.",
      bullets: [
        "Fragile zaps nobody owns",
        "No CRM context in the trigger",
        "Consequential actions without approval",
        "Outcomes that never feed learning",
      ],
    },
    approach: {
      title: "Act on the Event Bus",
      body: "DigitalGate Automation shapes platform events into multi-step workflows — create tasks, send communications, advance opportunities — with governance built in.",
    },
    capabilities: [
      { title: "Triggers", body: "CRM events, form submissions, stage changes and platform signals." },
      { title: "Multi-step actions", body: "Chains that reflect real operating procedures." },
      { title: "Communications", body: "Follow-ups through connected Communications — not a separate inbox." },
      { title: "Human approval", body: "Consequential steps can require human approval before execution." },
      { title: "Cross-app workflows", body: "Industry Apps, Commerce and Growth participate in the same event model." },
      { title: "Logs & learning", body: "Outcomes recorded so operators can improve rules over time." },
    ],
    howItWorks: ["Event fires", "Rule matches", "Actions queued", "Approval if required", "Execute", "Log outcome", "Improve"],
    connected: {
      title: "Connected Business advantage",
      body: "Automation without Core context is theatre. DigitalGate rules read the same Contacts, Opportunities and Communications the team uses daily.",
      bullets: ["CRM & Opportunities", "Communications", "Industry workflows", "Growth signals as triggers"],
    },
    intelligence: {
      title: "AI-assisted automation",
      body: "Where supported, AI can recommend or draft automation steps — always through controlled platform tools, not unbounded autonomy.",
    },
    workflow: {
      title: "Example workflow",
      steps: [
        "A new website lead creates a Contact and Opportunity.",
        "Automation assigns a task and sends a personalised acknowledgement.",
        "If no response in 48 hours, Advisor suggests a call — human approves.",
        "Outcome logged; rule refined for the next cycle.",
      ],
    },
    audience: {
      title: "Who it is for",
      bullets: [
        "Operators drowning in manual follow-up",
        "Businesses with real records on DigitalGate ready to act",
        "Teams that need approval gates, not silent auto-send",
      ],
    },
    faq: [
      {
        q: "Is this like Zapier?",
        a: "DigitalGate Automation is native to the platform Event Bus and Core objects — designed for business context, not generic app pairing alone.",
      },
    ],
    related: [
      { href: "/prospecting/", label: "Prospecting" },
      { href: "/apps/core/crm/", label: "CRM" },
      { href: "/apps/core/communications/", label: "Communications" },
      { href: "/apps/growth/automation/", label: "Automation App detail →" },
    ],
  }),

  L("analytics", {
    slug: "analytics",
    seoTitle: "Business Analytics & Dashboards | DigitalGate",
    metaDescription:
      "KPIs, dashboards and growth signals from connected DigitalGate data — honest empty states when connectors are missing.",
    keywords: ["business analytics", "small business dashboards", "business KPIs"],
    h1: "See the numbers behind the business",
    heroLead:
      "Analytics on DigitalGate measures connected performance — not vanity charts divorced from CRM, Commerce and Industry activity.",
    positioning:
      "Reporting only matters when data is authorised, connected and related to Business Health and the Digital Twin.",
    problem: {
      title: "Dashboards without context",
      body: "Exported CSVs and third-party BI tools recreate the fragmentation DigitalGate exists to solve.",
      bullets: [
        "Metrics that do not tie to pipeline or customers",
        "Manual exports every Monday",
        "No link to Business Health",
        "Missing data presented as certainty",
      ],
    },
    approach: {
      title: "Learn so the loop can Grow",
      body: "Analytics provides KPI snapshots and connectors so DigitalGate can Learn from performance — with clear empty states when data is not yet connected.",
    },
    capabilities: [
      { title: "KPIs & dashboards", body: "Operational and growth metrics where data exists." },
      { title: "Connected sources", body: "Website, Commerce, Industry Apps — subject to connector availability." },
      { title: "Growth signals", body: "Visibility and pipeline metrics alongside operational KPIs." },
      { title: "Business Health link", body: "Contributes to a broader view of organisational condition." },
      { title: "Twin context", body: "Performance feeds the evolving Digital Twin state." },
      { title: "Honest gaps", body: "We distinguish live connected data from areas requiring connectors." },
    ],
    howItWorks: ["Connect source", "Normalise signal", "Dashboard KPI", "Review trend", "Advisor insight", "Act", "Re-measure"],
    connected: {
      title: "Connected Business advantage",
      bullets: [
        "Same login as CRM and Growth Apps",
        "Metrics tied to real business objects where possible",
        "Outcomes visible to Advisor and Business Health",
      ],
      body: "Analytics is a Growth capability on the OS — not a separate BI product.",
    },
    intelligence: null,
    workflow: {
      title: "Example workflow",
      steps: [
        "Website and Commerce connectors provide traffic and revenue signals.",
        "Dashboard shows conversion trend alongside open opportunities.",
        "Business Health flags response-time drift despite revenue growth.",
        "Team prioritises operational fixes, not only marketing spend.",
      ],
    },
    audience: {
      title: "Who it is for",
      bullets: ["Operators who want Learn → Grow without exporting to another tool first", "Early Access customers building connector coverage"],
    },
    faq: [
      {
        q: "Does Analytics include all data automatically?",
        a: "No. Metrics depend on connected systems. Empty states explain what is missing rather than implying universal coverage.",
      },
    ],
    related: [
      { href: "/seo/", label: "SEO" },
      { href: "/business-brain/", label: "Business Brain" },
      { href: "/apps/growth/analytics/", label: "Analytics App detail →" },
    ],
  }),

  L("social", {
    slug: "social",
    seoTitle: "Social Media Management on Your Business Platform | DigitalGate",
    metaDescription:
      "Compose, schedule and manage social activity with business context on DigitalGate — Early Access; channel availability varies by connector.",
    keywords: ["social media management", "social scheduling platform"],
    h1: "Manage social as part of the business",
    heroLead:
      "Social publishing on DigitalGate connects to the same customers and campaigns — not another siloed scheduler.",
    positioning:
      "Distribution should know who you are talking to and why. Social sits in Growth alongside Reputation and Website.",
    problem: {
      title: "Social in a separate tab",
      body: "Scheduling tools rarely know your CRM, reviews or pipeline — so social becomes noise instead of signal.",
      bullets: [
        "No customer context at compose time",
        "Campaigns disconnected from outcomes",
        "Another login and another calendar",
      ],
    },
    approach: {
      title: "Social on the operating layer",
      body: "DigitalGate Social is Early Access — compose, schedule and workflow capabilities expand as connectors mature. We do not claim live publishing to a network unless that connector is operational.",
    },
    capabilities: [
      { title: "Compose & drafts", body: "Create content with review workflows." },
      { title: "Scheduling", body: "Plan publishing where channel connectors support it." },
      { title: "Business context", body: "Tie activity to Contacts and campaigns where available." },
      { title: "Reputation & Website", body: "Align social with reviews and site campaigns." },
    ],
    howItWorks: ["Draft", "Review", "Schedule", "Publish (if connected)", "Engage", "Measure", "Learn"],
    connected: {
      title: "Connected Business advantage",
      body: "Social signals can feed Analytics and Reputation when connected — part of one growth story.",
      bullets: ["Contacts", "Website campaigns", "Reputation reviews"],
    },
    intelligence: null,
    workflow: {
      title: "Example workflow",
      steps: [
        "Marketing drafts a campaign tied to a new service launch.",
        "Schedule aligns with website page publish.",
        "Inbound engagement creates or updates Contacts.",
        "Reputation monitoring picks up related reviews.",
      ],
    },
    audience: {
      title: "Who it is for",
      bullets: ["Teams wanting social on-platform during Early Access", "Businesses already centralising CRM on DigitalGate"],
    },
    faq: [
      {
        q: "Which networks can I publish to?",
        a: "Channel availability depends on operational connectors. The product page and platform status reflect what is live — we do not overclaim.",
      },
    ],
    related: [
      { href: "/reputation/", label: "Reputation" },
      { href: "/ai-communications/", label: "AI Communications" },
      { href: "/apps/growth/social/", label: "Social App detail →" },
    ],
  }),

  L("reputation", {
    slug: "reputation",
    seoTitle: "Review & Reputation Management | DigitalGate",
    metaDescription:
      "Review inbox, response workflows and reputation signals on DigitalGate — Free Growth App; scores only when real data exists.",
    keywords: ["reputation management", "review management software"],
    h1: "Turn customer feedback into a business signal",
    heroLead:
      "Reputation on DigitalGate connects reviews to CRM and Business Health — with Reputation Score only when real data supports it.",
    positioning:
      "Reviews are not a marketing side-project. They are signals the operating system should understand.",
    problem: {
      title: "Reviews trapped outside the business",
      body: "Teams monitor stars in a separate app while CRM holds the customer record — nobody connects feedback to follow-up or health.",
      bullets: [
        "Review alerts without customer context",
        "Slow or inconsistent responses",
        "Scores invented without data",
      ],
    },
    approach: {
      title: "Reputation as a Free Growth App",
      body: "DigitalGate Reputation provides review monitoring and response workflows on Core plumbing. It is Free — no Growth App charge — with honest limits where APIs apply.",
    },
    capabilities: [
      { title: "Review inbox", body: "Central place to see and respond to feedback." },
      { title: "Response workflows", body: "Turn reviews into tasks and communications." },
      { title: "Reputation Score™", body: "When supported by real connected review data — not invented." },
      { title: "CRM connection", body: "Link reviewers to Contacts and history." },
      { title: "Business Health", body: "Reputation contributes to overall business condition." },
    ],
    howItWorks: ["Review arrives", "Match customer", "Prioritise response", "Reply / task", "Log outcome", "Health signal", "Learn"],
    connected: {
      title: "Connected Business advantage",
      body: "Hospitality stays, real estate settlements and service jobs all generate feedback — Reputation keeps that on the record.",
      bullets: ["CRM Contacts", "Industry Apps", "AI Visibility context"],
    },
    intelligence: null,
    workflow: {
      title: "Example workflow",
      steps: [
        "A guest review arrives after an accommodation stay.",
        "Reputation matches the guest to CRM history.",
        "Manager responds; Automation logs follow-up for low scores.",
        "Business Health reflects review trend alongside occupancy.",
      ],
    },
    audience: {
      title: "Who it is for",
      bullets: ["Operators collecting reviews today", "Hospitality and services businesses on DigitalGate"],
    },
    faq: [
      {
        q: "Is Reputation really free?",
        a: "Yes — Reputation is a Free Growth App on the platform. Connector limitations may apply for specific review sources.",
      },
    ],
    related: [
      { href: "/social/", label: "Social" },
      { href: "/analytics/", label: "Analytics" },
      { href: "/apps/growth/reputation/", label: "Reputation App detail →" },
    ],
  }),

  L("prospecting", {
    slug: "prospecting",
    seoTitle: "Prospecting & Opportunity Engine | B2B Lead Discovery | DigitalGate",
    metaDescription:
      "Discover, score and qualify business opportunities with the Prospecting & Opportunity Engine — B2B discovery and CRM handoff, not residential property prospecting.",
    keywords: [
      "B2B prospecting",
      "lead discovery",
      "opportunity scoring",
      "sales prospecting software",
    ],
    h1: "Discover → Score → Qualify → Follow up → CRM",
    heroLead:
      "Prospecting & Opportunity Engine finds businesses worth attention, scores fit and need, and hands qualified opportunities to CRM — one Growth App on DigitalGate.",
    positioning:
      "This is B2B business discovery and opportunity scoring — not a residential vendor prospecting tool. Real estate vendor prospecting will have its own industry experience.",
    problem: {
      title: "Lists without intelligence",
      body: "Prospecting tools dump names into a spreadsheet. CRMs store them. Neither decides who deserves attention today or why.",
      bullets: [
        "Static lists with no scoring",
        "No connection to digital presence",
        "Manual handoff to sales",
        "No loop back to Automation",
      ],
    },
    approach: {
      title: "The Understand → Decide → Act product",
      body: "Discovery (Places + ABN when configured), digital presence signals, Fit × Need × Reachability scoring, pipeline, AI recommendations and CRM conversion — one App.",
    },
    capabilities: [
      { title: "Prospect discovery", body: "Find businesses via configured discovery sources — not generic residential data." },
      { title: "Digital presence signals", body: "Website and visibility context in scoring." },
      { title: "Opportunity scoring", body: "Fit, need, reachability, commercial potential and weakness signals." },
      { title: "Pipeline & activity", body: "Work prospects before they become CRM noise." },
      { title: "AI recommendations", body: "Next-best-action when Advisor context is available." },
      { title: "CRM handoff", body: "Qualified prospects become Contacts, Companies and Opportunities." },
    ],
    howItWorks: ["Discover", "Score", "Qualify", "Recommend action", "Follow up", "Convert to CRM", "Learn"],
    connected: {
      title: "Connected Business advantage",
      body: "Prospecting reads the same presence layer as SEO and AI Visibility — and writes forward into Automation and CRM.",
      bullets: ["AI Visibility", "SEO audits", "CRM & Opportunities", "Automation outreach"],
    },
    intelligence: {
      title: "Intelligence layer",
      body: "Business Brain and Advisor prioritise which scored opportunities match goals and capacity — turning lists into decisions.",
    },
    workflow: {
      title: "Example workflow (B2B)",
      steps: [
        "A commercial finance broker runs discovery in a target geography.",
        "Presence audit surfaces weak digital maturity with strong fit signals.",
        "Opportunity Engine ranks top prospects; Advisor suggests outreach order.",
        "Automation drafts follow-up; human approves.",
        "Won opportunities become CRM records with full history.",
      ],
    },
    audience: {
      title: "Who it is for",
      bullets: [
        "B2B operators needing a qualified pipeline",
        "Commercial and agency businesses on DigitalGate",
        "Not residential vendor prospecting — see Industry pages for RE workflows",
      ],
    },
    faq: [
      {
        q: "Is this for real estate vendor prospecting?",
        a: "No. This App is B2B business discovery and opportunity scoring. Real estate vendor prospecting will be addressed in industry-specific experiences.",
      },
      {
        q: "What is included in one App?",
        a: "Prospecting, Discovery, Opportunity scoring, Pipeline, Activity, AI recommendations and CRM handoff — one Growth App per catalog pricing.",
      },
    ],
    related: [
      { href: "/seo/", label: "SEO" },
      { href: "/ai-visibility/", label: "AI Visibility" },
      { href: "/automation/", label: "Automation" },
      { href: "/apps/growth/prospecting/", label: "Prospecting App detail →" },
    ],
  }),

  L("ai-communications", {
    slug: "ai-communications",
    seoTitle: "AI Communications for Business | DigitalGate",
    metaDescription:
      "AI-assisted voice, chat, email and SMS on Core Communications — Early Access; distinct from Core Communications infrastructure.",
    keywords: ["AI communications", "AI voice agent business", "AI messaging"],
    h1: "AI-powered communications — distinct from Core Communications",
    heroLead:
      "Core Communications is your connected business communication infrastructure. AI Communications adds advanced AI assistance on top — without merging the two concepts for marketing convenience.",
    positioning:
      "Do not confuse the inbox with the intelligence. Core carries messages; AI Communications assists composition, routing and future voice — honestly scoped.",
    problem: {
      title: "Chatbots bolted onto silos",
      body: "Generic AI chat widgets do not know your customers, promises or pipeline — they guess with better grammar.",
      bullets: [
        "No CRM context in conversations",
        "Voice agents overclaimed before they ship",
        "Duplicate comms stacks",
      ],
    },
    approach: {
      title: "Assist on Core Communications",
      body: "AI Communications is Early Access — AI-assisted messaging on Core plumbing. Voice agents remain in development; we do not sell a live call-centre product before it exists.",
    },
    capabilities: [
      { title: "AI-assisted messaging", body: "Draft and assist across channels where supported." },
      { title: "Core Communications base", body: "Email, SMS and conversation history on-platform." },
      { title: "CRM context", body: "Communications tied to Contacts when connected." },
      { title: "Automation handoff", body: "Workflows can trigger or follow communications." },
      { title: "Voice (development)", body: "Voice capabilities on the roadmap — status shown honestly in product." },
    ],
    howItWorks: ["Message arrives", "Context loaded", "AI assists draft", "Human reviews", "Send via Core", "Log to CRM", "Learn"],
    connected: {
      title: "Core vs AI Communications",
      body: "Core Communications = infrastructure and record. AI Communications = advanced AI layer. Both appear in architecture docs and pricing separately.",
      bullets: ["Core Communications App", "Contacts & CRM", "Automation", "Business Knowledge"],
    },
    intelligence: {
      title: "Business context required",
      body: "Useful AI communication requires authorised customer context — the same Connected Business principle as Advisor and Brain.",
    },
    workflow: {
      title: "Example workflow",
      steps: [
        "An inbound SMS arrives on a known Contact.",
        "AI Communications drafts a reply using CRM history and open Opportunity.",
        "Agent approves and sends through Core Communications.",
        "Automation schedules follow-up if no response.",
      ],
    },
    audience: {
      title: "Who it is for",
      bullets: ["Founding teams wanting AI assist now", "Businesses already on Core Communications"],
    },
    faq: [
      {
        q: "Is AI Communications the same as Communications in Core?",
        a: "No. Core Communications is the connected communication infrastructure included in the platform foundation. AI Communications is an optional Growth App for advanced AI capabilities.",
      },
      {
        q: "Are voice agents live?",
        a: "Voice remains in development. Commercial pages reflect Early Access scope — check platform status for what is operational today.",
      },
    ],
    related: [
      { href: "/apps/core/communications/", label: "Core Communications" },
      { href: "/automation/", label: "Automation" },
      { href: "/apps/growth/ai-communications/", label: "AI Communications App detail →" },
    ],
  }),
];

export function landingBySlug(slug) {
  return GROWTH_LANDINGS.find((l) => l.slug === slug);
}

export function growthAppTiles() {
  return GROWTH_LANDINGS.map((l) => ({
    href: `/${l.slug}/`,
    name: l.appName || l.slug,
    headline: l.h1,
    badge: l.badge,
  }));
}
