import { ElevenLabsProvider, isElevenLabsConfigured } from "./elevenlabs";
import { StubVoiceProvider } from "./stub";
import type { CommunicationProvider, CommunicationProviderId } from "./types";

const cache = new Map<string, CommunicationProvider>();

/**
 * Resolve a Voice Provider adapter.
 * ElevenLabs is Live; openai_voice and others fall through to stub until implemented.
 * Never treat the voice vendor as DigitalGate’s intelligence layer.
 */
export function getCommunicationProvider(
  id: CommunicationProviderId | string = "elevenlabs",
): CommunicationProvider {
  const key = id === "elevenlabs" && !isElevenLabsConfigured() ? "stub" : id;
  const existing = cache.get(key);
  if (existing) return existing;

  let provider: CommunicationProvider;
  switch (key) {
    case "elevenlabs":
      provider = new ElevenLabsProvider();
      break;
    case "openai_voice":
      // Direction: OpenAI Realtime adapter — stub until Live.
      provider = new StubVoiceProvider();
      break;
    default:
      provider = new StubVoiceProvider();
      break;
  }
  cache.set(key, provider);
  return provider;
}

export function defaultVoiceProviderId(): CommunicationProviderId {
  return isElevenLabsConfigured() ? "elevenlabs" : "stub";
}
