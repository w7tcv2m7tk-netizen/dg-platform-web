import type { GrowthAppId } from "@/lib/growth-apps";
export const GROWTH_CAPABILITY_HORIZON: Record<GrowthAppId,readonly string[]> = {
 marketing:["Campaign planning","Audience segmentation","Funnels & conversion optimisation","Email lifecycle & nurture","Attribution"],
 advertising:["Cross-channel budget view","Campaign optimisation","Lead & revenue attribution","Creative performance"],
 prospecting:["Aida-assisted outreach","Contact enrichment","DigitalGate Communications handoff","Consultation conversion"],
 "ai-visibility":["AI answer monitoring","Recommendation visibility","Entity coverage","Competitive visibility"],
 seo:["Rank tracking","Technical monitoring","Content opportunities","Local search"],
 social:["Direct publishing","Content planning","Engagement intelligence","Cross-network performance"],
 reviews:["Review requests","Reply workflow","Theme intelligence","Advocacy & referral prompts"],
 automation:["Visual workflow builder","Lifecycle triggers","Cross-app actions","Webhooks & integrations"],
 analytics:["Executive dashboards","Channel attribution","Retention & customer growth","Custom reporting"],
};
