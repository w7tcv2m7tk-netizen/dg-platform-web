import { ElevenLabsProvider, isElevenLabsConfigured } from "./elevenlabs";
import { StubVoiceProvider } from "./stub";
import type { CommunicationProvider, CommunicationProviderId } from "./types";

const cache = new Map<string, CommunicationProvider>();

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
