import { getOrganisationBusinessProfile } from "../org/onboarding-profile";
import type { AgentBuilderConfig } from "./providers/types";

/** Authorised subset of Business Brain for AI agents — never bank or secrets. */
export type AuthorisedAgentContext = {
  businessName: string | null;
  tradingName: string | null;
  industry: string | null;
  tagline: string | null;
  tone: string | null;
  services: string | null;
  targetAudience: string | null;
  websiteUrl: string | null;
  phone: string | null;
  location: string | null;
  hours: string | null;
  timezone: string | null;
};

export async function getAuthorisedAgentContext(
  organisationId: string,
): Promise<AuthorisedAgentContext> {
  const profile = await getOrganisationBusinessProfile(organisationId);
  const primary = profile?.locations?.find((l) => l.isPrimary) ?? profile?.locations?.[0];
  const addr = primary ?? profile?.address;
  const location = addr
    ? [addr.street, addr.city, addr.state, addr.postcode, addr.country].filter(Boolean).join(", ")
    : null;

  return {
    businessName: profile?.businessName?.trim() || null,
    tradingName: profile?.tradingName?.trim() || null,
    industry: profile?.industryVertical?.trim() || null,
    tagline: profile?.brandVoice?.tagline?.trim() || null,
    tone: profile?.brandVoice?.tone?.trim() || null,
    services: profile?.brandVoice?.services?.trim() || null,
    targetAudience: profile?.brandVoice?.targetAudience?.trim() || null,
    websiteUrl: profile?.websiteUrl?.trim() || null,
    phone: profile?.businessPhone?.trim() || profile?.contactPhone?.trim() || null,
    location,
    hours: profile?.businessHours?.schedule?.trim() || null,
    timezone: profile?.businessHours?.timezone?.trim() || null,
  };
}

export function formatAgentContextBlock(ctx: AuthorisedAgentContext): string {
  const lines = [
    ctx.tradingName || ctx.businessName ? `Business: ${ctx.tradingName || ctx.businessName}` : null,
    ctx.industry ? `Industry: ${ctx.industry}` : null,
    ctx.tagline ? `Tagline: ${ctx.tagline}` : null,
    ctx.tone ? `Brand tone: ${ctx.tone}` : null,
    ctx.services ? `Services/products:\n${ctx.services}` : null,
    ctx.targetAudience ? `Target audience: ${ctx.targetAudience}` : null,
    ctx.location ? `Location: ${ctx.location}` : null,
    ctx.hours ? `Hours: ${ctx.hours}` : null,
    ctx.timezone ? `Timezone: ${ctx.timezone}` : null,
    ctx.phone ? `Public phone: ${ctx.phone}` : null,
    ctx.websiteUrl ? `Website: ${ctx.websiteUrl}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

export function compileAgentSystemPrompt(input: {
  name: string;
  type: string;
  description?: string | null;
  greeting?: string | null;
  language: string;
  timezone: string;
  config: AgentBuilderConfig;
  businessContext: AuthorisedAgentContext;
  extraPrompt?: string | null;
}): string {
  const cfg = input.config;
  const sections = [
    `You are ${input.name}, a DigitalGate AI ${input.type} agent.`,
    input.description ? `Role: ${input.description}` : null,
    cfg.personality ? `Personality: ${cfg.personality}` : null,
    cfg.tone ? `Tone: ${cfg.tone}` : null,
    cfg.primaryObjective ? `Primary objective: ${cfg.primaryObjective}` : null,
    cfg.secondaryObjectives?.length
      ? `Secondary objectives:\n- ${cfg.secondaryObjectives.join("\n- ")}`
      : null,
    cfg.successCriteria ? `Success criteria: ${cfg.successCriteria}` : null,
    `Language: ${input.language}. Timezone: ${input.timezone}.`,
    input.greeting ? `Opening greeting: ${input.greeting}` : null,
    "## Authorised business context",
    formatAgentContextBlock(input.businessContext) || "(No business profile yet.)",
    cfg.qualificationQuestions?.length
      ? `## Qualification questions\n- ${cfg.qualificationQuestions.join("\n- ")}`
      : null,
    cfg.mayProvide?.length ? `## You may provide\n- ${cfg.mayProvide.join("\n- ")}` : null,
    cfg.mustNotProvide?.length
      ? `## You must not provide\n- ${cfg.mustNotProvide.join("\n- ")}`
      : null,
    cfg.enabledTools?.length
      ? `## Authorised DigitalGate tools\nOnly use these tools: ${cfg.enabledTools.join(", ")}.`
      : "Do not take CRM actions unless a tool is explicitly available.",
    cfg.disclosure
      ? `## Compliance\n${cfg.disclosure}`
      : "If recording, disclose that the call may be recorded where required under Australian law.",
    cfg.recordingConsent === false
      ? "Do not claim the call is recorded unless the caller has consented."
      : null,
    cfg.outOfHoursMessage ? `Out of hours: ${cfg.outOfHoursMessage}` : null,
    cfg.fallback ? `Human fallback: ${cfg.fallback}` : null,
    "Never invent prices, legal advice, or confidential customer data.",
    "Never expose internal IDs, API keys, or unrestricted organisation data.",
    input.extraPrompt?.trim() || null,
  ].filter(Boolean);

  return sections.join("\n\n");
}
