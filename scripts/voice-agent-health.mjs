/**
 * Smoke-check ElevenLabs voice configuration.
 * Usage:
 *   node --env-file=.env.local scripts/voice-agent-health.mjs
 *   node --env-file=.env.local scripts/voice-agent-health.mjs --smoke-tools
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });

const smokeTools = process.argv.includes("--smoke-tools");
const key = process.env.ELEVENLABS_API_KEY?.trim();
const webhookSecret = process.env.ELEVENLABS_WEBHOOK_SECRET?.trim();
const toolSecret =
  process.env.ELEVENLABS_TOOL_SECRET?.trim() || process.env.ELEVENLABS_API_KEY?.trim();
const origin = (process.env.NEXT_PUBLIC_APP_URL || "https://app.digitalgate.com.au").replace(
  /\/$/,
  "",
);
const prodOrigin = "https://app.digitalgate.com.au";

const report = {
  ELEVENLABS_API_KEY: Boolean(key),
  ELEVENLABS_WEBHOOK_SECRET: Boolean(webhookSecret),
  ELEVENLABS_TOOL_SECRET: Boolean(toolSecret),
  NEXT_PUBLIC_APP_URL: origin,
  postCallWebhook: `${prodOrigin}/api/webhooks/elevenlabs`,
  voices: null,
  subscription: null,
  toolSmoke: null,
  error: null,
};

async function main() {
  if (!key) {
    report.error = "ELEVENLABS_API_KEY is empty — paste your key into .env.local and Vercel";
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const headers = { "xi-api-key": key, Accept: "application/json" };

  const voicesRes = await fetch("https://api.elevenlabs.io/v1/voices", { headers });
  const voicesJson = await voicesRes.json().catch(() => ({}));
  if (!voicesRes.ok) {
    report.error = `voices ${voicesRes.status}: ${JSON.stringify(voicesJson).slice(0, 300)}`;
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }
  report.voices = {
    count: Array.isArray(voicesJson.voices) ? voicesJson.voices.length : 0,
    sample: (voicesJson.voices || []).slice(0, 3).map((v) => ({
      id: v.voice_id,
      name: v.name,
    })),
  };

  const subRes = await fetch("https://api.elevenlabs.io/v1/user/subscription", { headers });
  report.subscription = {
    ok: subRes.ok,
    status: subRes.status,
  };

  const settingsRes = await fetch("https://api.elevenlabs.io/v1/convai/settings", { headers });
  const settings = await settingsRes.json().catch(() => ({}));
  report.convaiSettings = {
    ok: settingsRes.ok,
    postCallWebhookId: settings?.webhooks?.post_call_webhook_id ?? null,
    events: settings?.webhooks?.events ?? [],
  };

  const prisma = new PrismaClient();
  try {
    const agents = await prisma.communicationAgent.findMany({
      select: { id: true, name: true, status: true, providerAgentId: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    });
    report.dbAgents = agents;

    if (smokeTools && toolSecret) {
      const agent =
        agents.find((a) => a.status === "published" && a.providerAgentId) || agents[0];
      if (agent) {
        const url = `${prodOrigin}/api/webhooks/elevenlabs/tools?agentId=${encodeURIComponent(agent.id)}&tool=get_business_profile`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${toolSecret}`,
            "Content-Type": "application/json",
          },
          body: "{}",
        });
        const text = await res.text();
        report.toolSmoke = {
          status: res.status,
          ok: res.ok,
          agentId: agent.id,
          bodyPreview: text.slice(0, 400),
        };
      }
    }
  } catch (err) {
    report.dbAgents = `error: ${err.message}`;
  } finally {
    await prisma.$disconnect();
  }

  console.log(JSON.stringify(report, null, 2));
  if (smokeTools && report.toolSmoke && !report.toolSmoke.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
