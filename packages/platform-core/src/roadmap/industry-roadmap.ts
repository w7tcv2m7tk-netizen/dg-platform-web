import { INDUSTRY_TAXONOMY } from "../apps/industry-taxonomy";
import type { RoadmapItem } from "./index";

const CURRENTLY_ACTIVE_APPS = new Set([
  "real-estate",
  "property-management",
  "commercial",
  "accommodation",
  "services",
  "finance",
]);

/**
 * Every supported sub-industry gets the same four measurable product horizons.
 * The taxonomy supplies industry-specific meaning while this keeps roadmap coverage consistent.
 */
export const INDUSTRY_SUBINDUSTRY_ROADMAP: RoadmapItem[] = INDUSTRY_TAXONOMY.flatMap((group) =>
  group.subIndustries.flatMap((sub): RoadmapItem[] => {
    const active = CURRENTLY_ACTIVE_APPS.has(sub.appId);
    const prefix = `industry.${group.id}.${sub.id}`;
    const area = `${group.name} · ${sub.name}`;
    return [
      {
        id: `${prefix}.workspace`,
        area,
        label: `${sub.name} operating workspace`,
        description: `${sub.description} Purpose-built records, dashboards, lifecycle states and daily operating workflows.`,
        status: active ? "in_progress" : "planned",
        priority: "high",
        appId: sub.appId,
        track: "gen2",
      },
      {
        id: `${prefix}.workflow`,
        area,
        label: `${sub.name} workflow automation`,
        description: "End-to-end workflow automation, tasks, approvals, communications, documents and exception handling for this sub-industry.",
        status: "planned",
        priority: "high",
        appId: sub.appId,
        track: "gen2",
      },
      {
        id: `${prefix}.intelligence`,
        area,
        label: `${sub.name} intelligence & Aida`,
        description: "Industry-specific KPIs, forecasting, risk/opportunity detection, recommendations and permissioned Aida actions grounded in live business data.",
        status: "planned",
        priority: "high",
        appId: sub.appId,
        track: "gen2",
      },
      {
        id: `${prefix}.integrations`,
        area,
        label: `${sub.name} integrations & compliance`,
        description: "The external systems, data sources, regulatory/compliance controls and specialist integrations required for a complete operating system.",
        status: "planned",
        priority: "medium",
        appId: sub.appId,
        track: "gen2",
      },
    ];
  }),
);
