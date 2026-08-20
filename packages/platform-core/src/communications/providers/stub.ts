import type {
  CommunicationProvider,
  ProviderAgentRef,
  ProviderConversation,
  ProviderSessionRef,
  UpsertAgentInput,
  VoiceOption,
} from "./types";

/** Local fallback when no voice provider key is configured. */
export class StubVoiceProvider implements CommunicationProvider {
  readonly id = "stub" as const;
  private agents = new Map<string, UpsertAgentInput>();

  async createAgent(config: UpsertAgentInput): Promise<ProviderAgentRef> {
    const providerAgentId = `stub_${Date.now().toString(36)}`;
    this.agents.set(providerAgentId, config);
    return { provider: this.id, providerAgentId };
  }

  async updateAgent(ref: ProviderAgentRef, config: UpsertAgentInput): Promise<ProviderAgentRef> {
    this.agents.set(ref.providerAgentId, config);
    return ref;
  }

  async deleteAgent(ref: ProviderAgentRef): Promise<void> {
    this.agents.delete(ref.providerAgentId);
  }

  async getAgent(ref: ProviderAgentRef): Promise<Record<string, unknown> | null> {
    const config = this.agents.get(ref.providerAgentId);
    return config ? { ...config, id: ref.providerAgentId } : null;
  }

  async listAgents(): Promise<Array<{ id: string; name: string }>> {
    return [...this.agents.entries()].map(([id, config]) => ({ id, name: config.name }));
  }

  async listVoices(): Promise<VoiceOption[]> {
    return [
      { id: "stub-en-au", name: "Australian English (stub)" },
      { id: "stub-en-warm", name: "Warm receptionist (stub)" },
    ];
  }

  async getConversation(_ref: ProviderSessionRef): Promise<ProviderConversation | null> {
    return null;
  }

  async listConversations(): Promise<ProviderConversation[]> {
    return [];
  }

  async getUsage() {
    return { connected: false, raw: { provider: "stub" } };
  }
}
