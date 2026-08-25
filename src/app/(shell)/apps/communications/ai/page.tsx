import Link from "next/link";

import { CommunicationsChannelPlaceholder } from "@/components/communications/CommunicationsChannelPlaceholder";

const AI_LINKS = [
  { href: "/apps/ai-communications/voice", label: "Voice Agents" },
  { href: "/apps/ai-communications/call-centre", label: "Call Centre" },
  { href: "/apps/ai-communications/agents", label: "Agent Builder" },
  { href: "/apps/ai-communications/knowledge", label: "Knowledge" },
  { href: "/apps/ai-communications/settings", label: "AI Settings" },
] as const;

export default function CommunicationsAiHubPage() {
  return (
    <div className="space-y-6">
      <CommunicationsChannelPlaceholder
        active="ai"
        title="AI"
        summary="How DigitalGate helps the business communicate — voice, agents, knowledge, and settings."
        detail="Email, SMS and Calls are channels. AI is the assist layer: Voice Agents, Call Centre, Agent Builder, Knowledge (feeds from Business Brain), and AI Settings. Capacity may still be a Growth add-on commercially; the operator IA lives under Core Communications."
        primaryHref="/apps/ai-communications/voice"
        primaryLabel="Voice Agents"
        secondaryHref="/apps/ai-communications/knowledge"
        secondaryLabel="Knowledge"
      />
      <ul className="mx-auto max-w-xl space-y-2 px-4 text-sm">
        {AI_LINKS.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-sky-400 hover:underline">
              {link.label} →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
