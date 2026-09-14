export const INDUSTRY_APP_LABELS: Record<string, string> = {
  "real-estate": "Real Estate",
  "property-management": "Property Management",
  commercial: "Commercial",
  accommodation: "Accommodation",
  services: "Services",
  finance: "Finance",
};

export const GROWTH_APP_LABELS: Record<string, string> = {
  prospecting_pro: "Prospecting",
  ai_visibility_pro: "AI Visibility",
  seo_pro: "SEO",
  automation_pro: "Automation",
  analytics_pro: "Analytics",
  social_pro: "Social",
  voice_ai: "Voice AI",
};

export function commercialAppLabel(id: string, group: "industry" | "growth") {
  return (group === "industry" ? INDUSTRY_APP_LABELS : GROWTH_APP_LABELS)[id] ?? id;
}
