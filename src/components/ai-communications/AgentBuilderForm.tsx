"use client";

import {
  AGENT_STARTER_TEMPLATES,
  AGENT_TOOL_GROUPS,
  ELEVENLABS_CONVAI_LLMS,
  type AgentBuilderConfig,
} from "@dg/platform-core";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { usePendingAction } from "@/hooks/usePendingAction";

const AGENT_TYPES = [
  "receptionist",
  "sales",
  "support",
  "booking",
  "qualification",
  "follow_up",
  "custom",
] as const;

type VoiceOption = { id: string; name: string };
type AgentRecord = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  voiceId: string | null;
  model: string | null;
  greeting: string | null;
  language: string;
  timezone: string;
  systemPrompt: string | null;
  config: AgentBuilderConfig;
};

type StarterTemplate = {
  id: string;
  label: string;
  description: string;
  type: string;
  name: string;
  greeting: string;
  language: string;
  timezone: string;
  systemPrompt?: string;
  config: AgentBuilderConfig;
};

const RECEPTIONIST_FALLBACK: StarterTemplate =
  AGENT_STARTER_TEMPLATES.find((t) => t.id === "receptionist") ?? AGENT_STARTER_TEMPLATES[0];

function lines(value?: string[] | string | null) {
  if (Array.isArray(value)) return value.join("\n");
  return value ?? "";
}

export function AgentBuilderForm({
  agent,
  templates = [RECEPTIONIST_FALLBACK],
}: {
  agent?: AgentRecord | null;
  templates?: StarterTemplate[];
}) {
  const router = useRouter();
  const { pending, error, setError, run, startTransition } = usePendingAction();
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [formKey, setFormKey] = useState(0);
  const [draft, setDraft] = useState<Partial<AgentRecord> | null>(agent ?? null);
  const [enabledTools, setEnabledTools] = useState<string[]>(
    agent?.config.enabledTools?.length
      ? [...agent.config.enabledTools]
      : [...(RECEPTIONIST_FALLBACK.config.enabledTools ?? [])],
  );

  const active = useMemo(() => draft ?? agent ?? null, [draft, agent]);
  const cfg = active?.config ?? {};

  useEffect(() => {
    fetch("/api/v1/communications/voices")
      .then((res) => res.json())
      .then((json) => {
        if (Array.isArray(json?.data)) setVoices(json.data);
      })
      .catch(() => undefined);
  }, []);

  function applyTemplate(template: StarterTemplate) {
    setDraft({
      name: template.name,
      description: template.description,
      type: template.type,
      greeting: template.greeting,
      language: template.language,
      timezone: template.timezone,
      systemPrompt: template.systemPrompt ?? null,
      config: template.config,
    });
    setEnabledTools(template.config.enabledTools ?? []);
    setFormKey((k) => k + 1);
  }

  function toggleTool(id: string) {
    setEnabledTools((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function save(publish: boolean) {
    const form = document.getElementById("agent-builder-form") as HTMLFormElement | null;
    if (!form) return;
    const data = new FormData(form);
    const split = (name: string) =>
      String(data.get(name) || "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

    const payload = {
      name: String(data.get("name") || "").trim(),
      description: String(data.get("description") || "").trim() || null,
      type: String(data.get("type") || "receptionist"),
      voiceId: String(data.get("voiceId") || "") || null,
      model: String(data.get("model") || "") || null,
      greeting: String(data.get("greeting") || "").trim() || null,
      language: String(data.get("language") || "en-AU"),
      timezone: String(data.get("timezone") || "Australia/Brisbane"),
      systemPrompt: String(data.get("systemPrompt") || "").trim() || null,
      config: {
        personality: String(data.get("personality") || "").trim() || undefined,
        tone: String(data.get("tone") || "").trim() || undefined,
        roleTitle: String(data.get("roleTitle") || "").trim() || undefined,
        primaryObjective: String(data.get("primaryObjective") || "").trim() || undefined,
        secondaryObjectives: split("secondaryObjectives"),
        successCriteria: String(data.get("successCriteria") || "").trim() || undefined,
        qualificationQuestions: split("qualificationQuestions"),
        mayProvide: split("mayProvide"),
        mustNotProvide: split("mustNotProvide"),
        enabledTools: enabledTools as AgentBuilderConfig["enabledTools"],
        recordingConsent: data.get("recordingConsent") === "on",
        disclosure: String(data.get("disclosure") || "").trim() || undefined,
        outOfHoursMode: String(data.get("outOfHoursMode") || "take_message") as
          | "take_message"
          | "inform_and_follow_up"
          | "transfer_on_call",
        outOfHoursMessage: String(data.get("outOfHoursMessage") || "").trim() || undefined,
        fallback: String(data.get("fallback") || "transfer") as
          | "transfer"
          | "voicemail"
          | "message",
        humanFallbackMessage: String(data.get("humanFallbackMessage") || "").trim() || undefined,
      },
    };

    if (!payload.name) {
      setError("Agent name is required");
      return;
    }

    await run(async () => {
      const url = agent
        ? `/api/v1/communications/agents/${agent.id}`
        : "/api/v1/communications/agents";
      const res = await fetch(url, {
        method: agent ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const message = json?.error?.message ?? "Failed to save agent";
        setError(message);
        throw new Error(message);
      }
      const id = json?.data?.id as string;
      if (publish && id) {
        const published = await fetch(`/api/v1/communications/agents/${id}/publish`, {
          method: "POST",
        });
        const pubJson = await published.json().catch(() => null);
        if (!published.ok) {
          const message = pubJson?.error?.message ?? "Saved, but publish to provider failed";
          setError(message);
          throw new Error(message);
        }
      }
      startTransition(() => {
        router.push(id ? `/apps/ai-communications/agents?id=${id}` : "/apps/ai-communications/voice");
        router.refresh();
      });
    });
  }

  return (
    <form
      id="agent-builder-form"
      key={formKey}
      className="space-y-8"
      onSubmit={(e) => e.preventDefault()}
    >
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      {!agent ? (
        <section className="dg-card space-y-3">
          <h2 className="font-semibold text-white">Start from template</h2>
          <p className="text-sm text-slate-400">
            Pre-fills identity, Business Brain–aware behaviour, DigitalGate tools, and compliance.
            ElevenLabs speaks; DigitalGate remains the system of record.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => applyTemplate(template)}
                className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-left transition hover:border-sky-500/60"
              >
                <div className="font-medium text-white">{template.label}</div>
                <p className="mt-1 text-sm text-slate-400">{template.description}</p>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="dg-card space-y-4">
        <h2 className="font-semibold text-white">Identity</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm text-slate-400">Agent name *</span>
            <input name="name" required defaultValue={active?.name} className="dg-input mt-1" />
          </label>
          <label className="block">
            <span className="text-sm text-slate-400">Role</span>
            <select
              name="type"
              defaultValue={active?.type ?? "receptionist"}
              className="dg-input mt-1"
            >
              {AGENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm text-slate-400">Description</span>
            <textarea
              name="description"
              defaultValue={active?.description ?? ""}
              className="dg-input mt-1 min-h-20"
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-400">Role title</span>
            <input
              name="roleTitle"
              defaultValue={cfg.roleTitle ?? "AI Business Receptionist"}
              className="dg-input mt-1"
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-400">Personality</span>
            <input
              name="personality"
              defaultValue={
                cfg.personality ??
                "Professional, warm, helpful, confident and conversational"
              }
              className="dg-input mt-1"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm text-slate-400">Tone</span>
            <input
              name="tone"
              defaultValue={cfg.tone ?? "Natural, concise and friendly"}
              className="dg-input mt-1"
            />
          </label>
        </div>
      </section>

      <section className="dg-card space-y-4">
        <h2 className="font-semibold text-white">Purpose</h2>
        <label className="block">
          <span className="text-sm text-slate-400">Primary objective</span>
          <input
            name="primaryObjective"
            defaultValue={
              cfg.primaryObjective ??
              "Understand the reason for the call and ensure the enquiry is properly captured and routed."
            }
            className="dg-input mt-1"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Secondary objectives (one per line)</span>
          <textarea
            name="secondaryObjectives"
            defaultValue={lines(cfg.secondaryObjectives)}
            className="dg-input mt-1 min-h-20"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Success criteria</span>
          <input
            name="successCriteria"
            defaultValue={cfg.successCriteria ?? ""}
            className="dg-input mt-1"
          />
        </label>
      </section>

      <section className="dg-card space-y-4">
        <h2 className="font-semibold text-white">Voice & language</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm text-slate-400">Voice</span>
            <select
              name="voiceId"
              defaultValue={active?.voiceId ?? ""}
              className="dg-input mt-1"
            >
              <option value="">Provider default</option>
              {voices.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.name}
                </option>
              ))}
            </select>
            {!voices.length ? (
              <p className="mt-1 text-xs text-amber-400">
                No voices loaded — set ELEVENLABS_API_KEY and refresh.
              </p>
            ) : null}
          </label>
          <label className="block">
            <span className="text-sm text-slate-400">Language</span>
            <input
              name="language"
              defaultValue={active?.language ?? "en-AU"}
              className="dg-input mt-1"
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-400">Timezone</span>
            <input
              name="timezone"
              defaultValue={active?.timezone ?? "Australia/Brisbane"}
              className="dg-input mt-1"
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-400">Conversation LLM</span>
            <select
              name="model"
              defaultValue={active?.model ?? "gemini-2.5-flash"}
              className="dg-input mt-1"
            >
              {ELEVENLABS_CONVAI_LLMS.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              ElevenLabs conversation model — not a TTS voice model.
            </p>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm text-slate-400">Greeting</span>
            <input
              name="greeting"
              defaultValue={
                active?.greeting ??
                "Thanks for calling {{business_name}}, you’re speaking with {{agent_name}}. How can I help you today?"
              }
              className="dg-input mt-1"
            />
            <p className="mt-1 text-xs text-slate-500">
              Use {"{{business_name}}"} and {"{{agent_name}}"} — resolved from Business Profile on
              publish.
            </p>
          </label>
        </div>
      </section>

      <section className="dg-card space-y-4">
        <h2 className="font-semibold text-white">Behaviour</h2>
        <label className="block">
          <span className="text-sm text-slate-400">
            Qualification questions (one per line — ask only when relevant)
          </span>
          <textarea
            name="qualificationQuestions"
            defaultValue={
              lines(cfg.qualificationQuestions) ||
              lines(RECEPTIONIST_FALLBACK.config.qualificationQuestions)
            }
            className="dg-input mt-1 min-h-24"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Information the agent may provide</span>
          <textarea
            name="mayProvide"
            defaultValue={lines(cfg.mayProvide) || lines(RECEPTIONIST_FALLBACK.config.mayProvide)}
            className="dg-input mt-1 min-h-20"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Information the agent must not provide</span>
          <textarea
            name="mustNotProvide"
            defaultValue={
              lines(cfg.mustNotProvide) || lines(RECEPTIONIST_FALLBACK.config.mustNotProvide)
            }
            className="dg-input mt-1 min-h-20"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Extra prompt notes</span>
          <textarea
            name="systemPrompt"
            defaultValue={active?.systemPrompt ?? RECEPTIONIST_FALLBACK.systemPrompt ?? ""}
            className="dg-input mt-1 min-h-28"
          />
        </label>
      </section>

      <section className="dg-card space-y-4">
        <h2 className="font-semibold text-white">DigitalGate tools</h2>
        <p className="text-sm text-slate-400">
          DigitalGate is the system of record. ElevenLabs provides the conversational voice
          experience. The voice agent never writes directly to your database. All business actions
          run through DigitalGate’s permission-controlled tools, with an audit trail.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {AGENT_TOOL_GROUPS.map((group) => (
            <div
              key={group.id}
              className="rounded-xl border border-slate-700/70 bg-slate-950/40 px-4 py-3"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">
                {group.label}
              </p>
              <ul className="mt-2 space-y-2">
                {group.tools.map((tool) => (
                  <li key={tool.id}>
                    <label className="flex items-center gap-2 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        checked={enabledTools.includes(tool.id)}
                        onChange={() => toggleTool(tool.id)}
                      />
                      {tool.label}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="dg-card space-y-4">
        <h2 className="font-semibold text-white">Escalation & compliance</h2>
        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input
            type="checkbox"
            name="recordingConsent"
            defaultChecked={cfg.recordingConsent !== false}
          />
          Recording disclosure enabled
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Disclosure</span>
          <textarea
            name="disclosure"
            defaultValue={
              cfg.disclosure ??
              "Just letting you know, this call may be recorded to help us improve our service."
            }
            className="dg-input mt-1 min-h-20"
          />
          <p className="mt-1 text-xs text-slate-500">
            Configurable by jurisdiction — do not assume recording is always lawful to announce.
          </p>
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Out of hours behaviour</span>
          <select
            name="outOfHoursMode"
            defaultValue={cfg.outOfHoursMode ?? "take_message"}
            className="dg-input mt-1"
          >
            <option value="take_message">Take message (default)</option>
            <option value="inform_and_follow_up">Provide information and create follow-up</option>
            <option value="transfer_on_call">Transfer to emergency / on-call (when configured)</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Out of hours guidance</span>
          <input
            name="outOfHoursMessage"
            defaultValue={
              cfg.outOfHoursMessage ??
              "Take a message, capture contact details, create a follow-up Task, and offer a callback."
            }
            className="dg-input mt-1"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Human fallback line</span>
          <input
            name="humanFallbackMessage"
            defaultValue={
              cfg.humanFallbackMessage ??
              "I want to make sure you get the right help with this. I’ll pass this through to someone from the team."
            }
            className="dg-input mt-1"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Human fallback action</span>
          <select
            name="fallback"
            defaultValue={cfg.fallback ?? "transfer"}
            className="dg-input mt-1"
          >
            <option value="transfer">Transfer to human</option>
            <option value="voicemail">Voicemail / message</option>
            <option value="message">Take a message / create Task</option>
          </select>
        </label>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => void save(false)}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save draft"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => void save(true)}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Publishing…" : "Save & publish"}
        </button>
      </div>
    </form>
  );
}
