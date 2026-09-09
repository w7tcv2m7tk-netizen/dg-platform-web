const INJECTION_PATTERNS = [
  /ignore (all |any )?(previous|prior|above) instructions/i,
  /disregard (the )?(system|developer) prompt/i,
  /reveal (your |the )?(system prompt|hidden instructions|api key)/i,
  /you are now (dan|jailbroken|unrestricted)/i,
  /pretend you are (a human|ben|an employee)/i,
  /show me (another|other) (customer|organisation|tenant)/i,
  /access (their|another) business brain/i,
];

export function detectAidaPromptInjection(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return INJECTION_PATTERNS.some((re) => re.test(trimmed));
}

export const AIDA_INJECTION_REFUSAL =
  "I can’t change my instructions, reveal internal configuration, or access another organisation’s Business Brain. I’m DigitalGate’s AI Business Advisor — happy to keep helping with DigitalGate itself. What would you like to know?";

export const AIDA_MAX_MESSAGE_CHARS = 2000;
export const AIDA_MAX_MESSAGES_PER_CONVERSATION = 40;
export const AIDA_LLM_HISTORY_LIMIT = 16;

export function validateAidaUserMessage(text: unknown): { ok: true; text: string } | { ok: false; message: string } {
  if (typeof text !== "string") {
    return { ok: false, message: "Message is required" };
  }
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, message: "Message is required" };
  if (trimmed.length > AIDA_MAX_MESSAGE_CHARS) {
    return { ok: false, message: `Keep messages under ${AIDA_MAX_MESSAGE_CHARS} characters` };
  }
  return { ok: true, text: trimmed };
}

export type AidaUiAction = "continue" | "capture" | "handoff";

const ACTION_RE = /\[\[AIDA_ACTION:(continue|capture|handoff)\]\]/i;

export function parseAidaModelOutput(raw: string): { text: string; action: AidaUiAction } {
  const match = ACTION_RE.exec(raw);
  const action = (match?.[1]?.toLowerCase() as AidaUiAction | undefined) ?? "continue";
  const text = raw.replace(ACTION_RE, "").trim();
  return { text: text || raw.trim(), action };
}

export function shouldSkipLlmForHandoff(quickActionId: string | undefined, text: string): boolean {
  if (quickActionId === "talk_to_someone") return true;
  return /\b(talk to (a )?human|speak to (someone|ben|a person)|real person|call me)\b/i.test(text);
}
