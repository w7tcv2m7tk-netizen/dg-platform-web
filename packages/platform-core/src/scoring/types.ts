/** Scoring Engine — one engine, many scores. Apps contribute data; engine calculates. */

export type ScoreId =
  | "ai_visibility"
  | "seo"
  | "website_health"
  | "business_growth"
  | "success_score"
  | "automation"
  | "conversion"
  | "reputation";

export interface ScoreDefinition {
  id: ScoreId;
  label: string;
  trademark?: string;
  description: string;
  /** App IDs that contribute data to this score */
  contributors: string[];
  maxValue: number;
}

export const SCORE_DEFINITIONS: ScoreDefinition[] = [
  {
    id: "ai_visibility",
    label: "AI Visibility Score",
    trademark: "AI Visibility Score™",
    description: "Brand presence across AI platforms",
    contributors: ["ai-visibility"],
    maxValue: 100,
  },
  {
    id: "seo",
    label: "SEO Score",
    trademark: "SEO Score™",
    description: "On-page, technical, and local SEO health",
    contributors: ["seo", "website-manager"],
    maxValue: 100,
  },
  {
    id: "website_health",
    label: "Website Health Score",
    trademark: "Website Health Score™",
    description: "Performance, uptime, and technical health",
    contributors: ["seo", "website-manager"],
    maxValue: 100,
  },
  {
    id: "business_growth",
    label: "Business Growth Score",
    trademark: "Business Growth Score™",
    description: "Composite growth and conversion metrics",
    contributors: ["crm", "marketing", "analytics"],
    maxValue: 100,
  },
  {
    id: "success_score",
    label: "DigitalGate Success Score",
    trademark: "DigitalGate Success Score™",
    description:
      "Composite client success metric — usage, visibility, SEO, automation, reviews, conversion, growth",
    contributors: [
      "crm",
      "real-estate",
      "seo",
      "ai-visibility",
      "marketing",
      "reviews",
      "command-centre",
    ],
    maxValue: 100,
  },
];

export interface ScoreResult {
  scoreId: ScoreId;
  organisationId: string;
  value: number;
  maxValue: number;
  calculatedAt: Date;
  breakdown?: Record<string, number>;
}
