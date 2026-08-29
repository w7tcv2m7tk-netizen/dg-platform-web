import Link from "next/link";

const CHANNELS = [
  { href: "/apps/communications/inbox", label: "Inbox", blurb: "Universal conversations" },
  { href: "/apps/communications/email", label: "Email", blurb: "Compose, sent, mailboxes" },
  { href: "/apps/communications/sms", label: "SMS", blurb: "Messaging channel" },
  { href: "/apps/communications/calls", label: "Calls", blurb: "Call history" },
] as const;

const AI_COMMS = [
  { href: "/apps/ai-communications/voice", label: "Voice Agents", blurb: "AI voice employees" },
  { href: "/apps/ai-communications/call-centre", label: "Call Centre", blurb: "Live AI call sessions" },
  { href: "/apps/ai-communications/agents", label: "Agent Builder", blurb: "Configure and publish" },
  { href: "/apps/ai-communications/knowledge", label: "Knowledge", blurb: "What AI may use when talking" },
] as const;

const CONFIG = [
  {
    href: "/apps/ai-communications/settings",
    label: "Settings",
    blurb: "Providers, channels, AI configuration, usage",
  },
  {
    href: "/apps/communications/templates",
    label: "Templates",
    blurb: "Reusable copy (under Email)",
  },
  {
    href: "/apps/communications/signatures",
    label: "Signatures",
    blurb: "Signature Studio (under Email)",
  },
  {
    href: "/apps/communications/outreach",
    label: "Outreach",
    blurb: "Acquisition sequences (under Email)",
  },
] as const;

function CardLink({
  href,
  label,
  blurb,
}: {
  href: string;
  label: string;
  blurb: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-4 py-4 transition hover:border-sky-500/40 hover:bg-slate-900/60"
    >
      <p className="font-medium text-white">{label}</p>
      <p className="mt-1 text-sm text-slate-400">{blurb}</p>
    </Link>
  );
}

/**
 * Communications overview — cards link to canonical AppContextNav destinations.
 * Do not mount a second in-page nav hierarchy here.
 */
export default function CommunicationsOverviewPage() {
  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Communications</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Centralise customer conversations, messaging, calls and AI communication capabilities.
          Use the tabs above to move through the section — one function, one location.
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Channels
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            How the business communicates with customers.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CHANNELS.map((item) => (
              <CardLink key={item.href} {...item} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            AI Communications
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Manage AI-powered conversations, voice agents, call centre and agent configuration.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {AI_COMMS.map((item) => (
              <CardLink key={item.href} {...item} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Configuration
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Provider status, communication defaults and usage.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CONFIG.map((item) => (
              <CardLink key={item.href} {...item} />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
