export const GROWTH_APP_ORDER = ["marketing","advertising","prospecting","ai-visibility","seo","social","reviews","automation","analytics"] as const;
export type GrowthAppId = (typeof GROWTH_APP_ORDER)[number];
export const GROWTH_APP_IDENTITY: Record<GrowthAppId,{name:string;icon:string;accent:"violet"|"amber"|"fuchsia"|"cyan"|"sky"|"pink"|"rose"|"emerald"|"indigo";description:string}> = {
 marketing:{name:"Marketing",icon:"◆",accent:"violet",description:"Plan campaigns, audiences, funnels and measurable growth."},
 advertising:{name:"Advertising",icon:"◫",accent:"amber",description:"Understand paid media performance, leads, attribution and optimisation."},
 prospecting:{name:"Prospecting",icon:"◎",accent:"fuchsia",description:"Find, qualify and convert the right businesses."},
 "ai-visibility":{name:"AI Visibility",icon:"✦",accent:"cyan",description:"Improve how AI systems discover and recommend your business."},
 seo:{name:"SEO",icon:"⌕",accent:"sky",description:"Improve organic search visibility, technical health and on-page performance."},
 social:{name:"Social",icon:"⊙",accent:"pink",description:"Build and manage your connected social presence and content."},
 reviews:{name:"Reputation",icon:"★",accent:"rose",description:"Monitor reviews, strengthen trust and turn feedback into growth."},
 automation:{name:"Automation",icon:"ϟ",accent:"emerald",description:"Scale repeatable growth workflows, triggers and follow-up."},
 analytics:{name:"Analytics",icon:"▥",accent:"indigo",description:"Measure performance, attribution and the signals that drive better decisions."}
};
