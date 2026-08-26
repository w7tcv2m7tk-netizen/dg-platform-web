import type { BusinessContext } from "../org/business-context";
import type { PlatformSetupStatus } from "../org/setup-status";
import { hasAdvancedCommsEntitlement } from "../communications/entitlements";
import type {
  BusinessBrainDimension,
  BusinessBrainField,
  BusinessBrainSnapshot,
} from "./types";

function field(
  id: string,
  label: string,
  present: boolean,
  href: string,
  value?: string,
  partial = false,
): BusinessBrainField {
  let status: BusinessBrainField["status"] = "missing";
  if (present) status = "ready";
  else if (partial) status = "partial";

  return {
    id,
    label,
    status,
    value: present || partial ? value : undefined,
    href,
  };
}

function dimension(
  id: BusinessBrainDimension["id"],
  name: string,
  summary: string,
  fields: BusinessBrainField[],
): BusinessBrainDimension {
  const readyCount = fields.filter((f) => f.status === "ready").length;
  const totalCount = fields.length;
  const weighted = fields.reduce(
    (sum, f) => sum + (f.status === "ready" ? 1 : f.status === "partial" ? 0.5 : 0),
    0,
  );
  return {
    id,
    name,
    summary,
    fields,
    readyCount,
    totalCount,
    percent: totalCount ? Math.round((weighted / totalCount) * 100) : 0,
  };
}

const SURFACES: BusinessBrainSnapshot["surfaces"] = [
  {
    label: "Digital Twin",
    href: "/dashboard/twin",
    uses: "Live operating state the Brain interprets",
  },
  {
    label: "Business Health",
    href: "/dashboard/health",
    uses: "Vital signs derived from Twin data and Brain context",
  },
  {
    label: "Benchmarks",
    href: "/dashboard/benchmarks",
    uses: "External comparison context for decisions",
  },
  {
    label: "Insights",
    href: "/dashboard/insights",
    uses: "What DigitalGate is noticing from your connected business",
  },
  {
    label: "AI Advisor",
    href: "/dashboard/advisor",
    uses: "Recommendations grounded in Brain understanding",
  },
  {
    label: "Analytics",
    href: "/apps/analytics",
    uses: "Underlying numbers and evidence behind interpretation",
  },
  {
    label: "Command Centre",
    href: "/dashboard",
    uses: "Priorities and actions from Brain-backed intelligence",
  },
  {
    label: "Communications",
    href: "/apps/communications",
    uses: "Authorised knowledge, tone and advanced voice context",
  },
];

export function buildBusinessBrain(input: {
  context: BusinessContext;
  setup?: PlatformSetupStatus | null;
  connectorCount?: number;
}): BusinessBrainSnapshot {
  const { context, setup } = input;
  const identity = context.identity;
  const contact = context.contact;
  const voice = context.brandVoice;
  const profile = context.profile;
  const connectorCount = input.connectorCount ?? context.twin.connectedSystems.length;
  const commsEnabled = hasAdvancedCommsEntitlement({
    enabledAppIds: context.enabledAppIds,
  });
  const automationEnabled = context.enabledAppIds.includes("automation");
  const crmEnabled = context.enabledAppIds.includes("crm");

  const dimensions: BusinessBrainDimension[] = [
    dimension(
      "business",
      "Business",
      "Plan, identity, brand, strategy and goals.",
      [
        field("name", "Company information", Boolean(identity.businessName), "/dashboard/business", identity.businessName),
        field("brand", "Brand", Boolean(identity.iconUrl || identity.logoUrl), "/dashboard/business", identity.brandColours?.join(" · "), Boolean(identity.brandColours?.length)),
        field("strategy", "Strategy", Boolean(voice.tagline && voice.tone), "/dashboard/business", voice.tagline || voice.tone, Boolean(voice.tagline || voice.tone)),
        field("goals", "Goals", context.goals.length > 0, "/dashboard/goals", `${context.goals.length} goal${context.goals.length === 1 ? "" : "s"}`),
        field("industry", "Industry", Boolean(identity.industry), "/dashboard/business", identity.industry),
      ],
    ),
    dimension(
      "people",
      "People",
      "Team, roles, responsibilities and contacts.",
      [
        field("team", "Team", Boolean(setup?.hasTeamMember), "/dashboard/settings/team", setup?.hasTeamMember ? "Team members on platform" : undefined),
        field("primary", "Primary contact", Boolean(contact.primaryName || contact.primaryEmail), "/dashboard/business", contact.primaryName || contact.primaryEmail),
        field("contacts", "CRM contacts", Boolean(setup?.hasContacts && (setup.contactCount ?? 0) >= 5), "/apps/crm/contacts", setup?.contactCount ? `${setup.contactCount} contacts` : undefined, Boolean(setup?.hasContacts)),
        field("roles", "Roles", Boolean(contact.primaryName), "/dashboard/settings/team", contact.primaryName),
      ],
    ),
    dimension(
      "operations",
      "Operations",
      "SOPs, processes, workflows and policies.",
      [
        field("hours", "Hours / policy", Boolean(identity.businessHours), "/dashboard/business", identity.businessHours),
        field("locations", "Locations", identity.locations.length > 0, "/dashboard/business", identity.locations[0]?.formatted),
        field("automation", "Automation", automationEnabled, "/apps/automation", automationEnabled ? "Automation App enabled" : undefined),
        field("activity", "Operating activity", Boolean(setup?.hasTimelineActivity), "/dashboard", setup?.activityCount ? `${setup.activityCount} activities` : undefined),
      ],
    ),
    dimension(
      "commercial",
      "Commercial",
      "Products, services, pricing and sales process.",
      [
        field("services", "Products / services", Boolean(voice.services && voice.services.length > 20), "/dashboard/business", voice.services?.slice(0, 80), Boolean(voice.services)),
        field("audience", "Target audience", Boolean(voice.targetAudience), "/dashboard/business", voice.targetAudience),
        field("crm", "Sales process (CRM)", crmEnabled, "/apps/crm", crmEnabled ? "CRM enabled" : undefined),
        field("website", "Public offer", Boolean(identity.website || setup?.hasPublishedWebsite), identity.website || "/apps/websites", identity.website),
      ],
    ),
    dimension(
      "knowledge",
      "Knowledge",
      "Documents, FAQs, training and internal knowledge.",
      [
        field("voice", "Brand voice", Boolean(voice.tone || voice.tagline), "/dashboard/business", voice.tone),
        field("docs", "Internal knowledge", commsEnabled, "/apps/ai-communications/knowledge", commsEnabled ? "Knowledge Base available" : undefined),
        field("competitors", "Market context", Boolean(voice.competitors), "/dashboard/business", voice.competitors),
      ],
    ),
    dimension(
      "technology",
      "Technology",
      "Software, connectors, websites, domains and data sources.",
      [
        field("connectors", "Connectors", connectorCount > 0, "/dashboard/settings/connectors", connectorCount ? `${connectorCount} connected` : undefined),
        field("sites", "Websites", Boolean(setup?.hasPublishedWebsite || context.twin.websites.length), "/apps/websites", setup?.hasPublishedWebsite ? "Published site" : undefined),
        field("apps", "Enabled Apps", context.enabledAppIds.length > 0, "/dashboard/apps", `${context.enabledAppIds.length} Apps`),
      ],
    ),
    dimension(
      "ai",
      "AI",
      "Context, permissions, approved tools and business-specific instructions.",
      [
        field("context", "Business context", Boolean(identity.businessName && (voice.services || voice.tone)), "/dashboard/brain", "Context builder live"),
        field("comms", "Communications", commsEnabled, "/apps/communications", commsEnabled ? "Advanced voice authorised from Brain" : undefined),
        field("advisor", "Advisor", true, "/dashboard/advisor", "Reads Twin + Brain"),
        field("instructions", "Business instructions", Boolean(voice.tone || profile?.brandVoice?.services), "/dashboard/business", voice.tone),
      ],
    ),
  ];

  const readyCount = dimensions.reduce(
    (sum, d) => sum + d.fields.filter((f) => f.status === "ready").length,
    0,
  );
  const totalCount = dimensions.reduce((sum, d) => sum + d.totalCount, 0);
  const weighted = dimensions.reduce(
    (sum, d) =>
      sum +
      d.fields.reduce(
        (fieldSum, f) => fieldSum + (f.status === "ready" ? 1 : f.status === "partial" ? 0.5 : 0),
        0,
      ),
    0,
  );

  return {
    organisationId: context.organisationId,
    organisationName: identity.businessName || context.organisationName,
    percent: totalCount ? Math.round((weighted / totalCount) * 100) : 0,
    readyCount,
    totalCount,
    dimensions,
    surfaces: SURFACES,
    capturedAt: new Date().toISOString(),
  };
}
