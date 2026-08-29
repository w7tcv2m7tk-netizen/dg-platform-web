"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ServiceStatus = "connected" | "not_connected" | "coming_next" | "managed";

type ServiceCard = {
  id: string;
  name: string;
  description: string;
  status: ServiceStatus;
  detail?: string | null;
  enables?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

type ServiceGroup = {
  id: string;
  title: string;
  cards: ServiceCard[];
};

function StatusDot({ status }: { status: ServiceStatus }) {
  if (status === "connected") {
    return <span className="text-emerald-400">● Connected</span>;
  }
  if (status === "managed") {
    return <span className="text-emerald-400/90">● Managed by DigitalGate</span>;
  }
  if (status === "coming_next") {
    return <span className="text-slate-500">○ Coming next</span>;
  }
  return <span className="text-slate-400">○ Not connected</span>;
}

function ServiceCardRow({ card }: { card: ServiceCard }) {
  return (
    <li className="rounded-xl border border-slate-700/70 bg-slate-950/40 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-xl">
          <p className="font-medium text-white">{card.name}</p>
          <p className="mt-1 text-sm text-slate-400">{card.description}</p>
          <p className="mt-2 text-xs">
            <StatusDot status={card.status} />
          </p>
          {card.detail ? (
            <p className="mt-1 text-xs text-slate-500">{card.detail}</p>
          ) : null}
          {card.enables ? (
            <p className="mt-1 text-xs text-slate-500">Enables: {card.enables}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {card.primaryHref && card.primaryLabel ? (
            card.primaryHref.startsWith("/api/") ? (
              <a
                href={card.primaryHref}
                className="rounded-full bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-sky-500"
              >
                {card.primaryLabel}
              </a>
            ) : (
              <Link
                href={card.primaryHref}
                className="rounded-full bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-sky-500"
              >
                {card.primaryLabel}
              </Link>
            )
          ) : null}
          {card.secondaryHref && card.secondaryLabel ? (
            <Link
              href={card.secondaryHref}
              className="rounded-full border border-slate-600 px-4 py-1.5 text-xs font-semibold text-slate-200 hover:border-slate-400"
            >
              {card.secondaryLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </li>
  );
}

const PLATFORM_CAPABILITIES: ServiceCard[] = [
  {
    id: "platform-ai",
    name: "AI models & gateway",
    description: "Model routing and AI infrastructure for Advisor, Assist, and agents.",
    status: "managed",
    detail: "Shared platform capacity — your business does not configure provider API keys.",
  },
  {
    id: "platform-voice",
    name: "Voice infrastructure",
    description: "Speech and voice-agent capability used by AI Communications.",
    status: "managed",
  },
  {
    id: "platform-email",
    name: "Email delivery",
    description: "Transactional and outbound email infrastructure (separate from your mailbox).",
    status: "managed",
    detail: "Connect Google Workspace or Microsoft 365 below for your business mailbox.",
  },
  {
    id: "platform-telephony",
    name: "Phone & SMS infrastructure",
    description: "Carrier connection DigitalGate manages. Your business numbers connect separately.",
    status: "managed",
    detail: "Connect business phone / SMS under Communications when available — not a carrier API.",
  },
  {
    id: "platform-hosting",
    name: "Hosting, DNS & monitoring",
    description: "Deployment, domains security, and observability for the platform.",
    status: "managed",
  },
  {
    id: "platform-billing",
    name: "DigitalGate billing",
    description: "Subscriptions and platform payments for your organisation.",
    status: "managed",
    primaryHref: "/dashboard/settings/billing",
    primaryLabel: "Billing",
  },
];

export function ConnectedServicesCatalog() {
  const [groups, setGroups] = useState<ServiceGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setError(null);
      try {
        const [gmailRes, gbpRes, microsoftRes, icloudRes] = await Promise.all([
          fetch("/api/v1/connectors/google-gmail/status"),
          fetch("/api/v1/connectors/google/status"),
          fetch("/api/v1/connectors/microsoft-365/status"),
          fetch("/api/v1/connectors/apple-icloud/status"),
        ]);
        const gmailJson = await gmailRes.json().catch(() => ({}));
        const gbpJson = await gbpRes.json().catch(() => ({}));
        const microsoftJson = await microsoftRes.json().catch(() => ({}));
        const icloudJson = await icloudRes.json().catch(() => ({}));

        const gmailOrg = gmailJson?.data?.organisation;
        const gbpOrg = gbpJson?.data?.organisation;
        const microsoftOrg = microsoftJson?.data?.organisation;
        const microsoftPlatform = microsoftJson?.data?.platform;
        const icloudOrg = icloudJson?.data?.organisation;
        const gmailConnected = Boolean(gmailOrg?.connected);
        const gbpConnected = Boolean(gbpOrg?.connected);
        const microsoftConnected = Boolean(microsoftOrg?.connected);
        const icloudConnected = Boolean(icloudOrg?.connected);
        const gmailEmail = gmailOrg?.email as string | null | undefined;
        const gmailLastSync = gmailOrg?.health?.lastSyncAt as string | null | undefined;
        const gbpLastSync = gbpOrg?.health?.lastSyncAt as string | null | undefined;
        const microsoftEmail = microsoftOrg?.email as string | null | undefined;
        const microsoftLastSync = microsoftOrg?.health?.lastSyncAt as
          | string
          | null
          | undefined;
        const icloudEmail = icloudOrg?.email as string | null | undefined;
        const icloudLastSync = icloudOrg?.health?.lastSyncAt as string | null | undefined;

        const next: ServiceGroup[] = [
          {
            id: "communications",
            title: "Communications",
            cards: [
              {
                id: "google-workspace",
                name: "Google Workspace / Gmail",
                description: "Your business mailbox — sync into Communications Inbox and CRM Timeline.",
                status: gmailConnected ? "connected" : "not_connected",
                detail: gmailConnected
                  ? [
                      gmailEmail,
                      gmailLastSync
                        ? `Last synced ${new Date(gmailLastSync).toLocaleString("en-AU")}`
                        : "Connected — run Sync on Mailboxes if inbox is empty",
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : "DigitalGate owns email delivery; you connect the mailbox your business already uses.",
                enables: "Inbox · Compose context · Timeline",
                primaryHref: gmailConnected
                  ? "/apps/communications/mailboxes"
                  : "/api/connectors/google-gmail/connect",
                primaryLabel: gmailConnected ? "Manage mailbox" : "Connect",
                secondaryHref: gmailConnected ? "/apps/communications" : undefined,
                secondaryLabel: gmailConnected ? "Open Inbox" : undefined,
              },
              {
                id: "microsoft-365",
                name: "Microsoft 365 / Outlook",
                description: "Business mailbox via Microsoft Graph — same pattern as Google.",
                status: microsoftConnected
                  ? "connected"
                  : microsoftPlatform?.configured
                    ? "not_connected"
                    : "coming_next",
                detail: microsoftConnected
                  ? [
                      microsoftEmail,
                      microsoftLastSync
                        ? `Last synced ${new Date(microsoftLastSync).toLocaleString("en-AU")}`
                        : "Connected — run Sync on Mailboxes if inbox is empty",
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : microsoftPlatform?.configured
                    ? "Ready to connect on Mailboxes."
                    : "Next after Google — add MICROSOFT_CLIENT_ID / SECRET to enable Connect.",
                enables: "Inbox · Compose context · Timeline",
                primaryHref: microsoftConnected
                  ? "/apps/communications/mailboxes"
                  : microsoftPlatform?.configured
                    ? "/api/connectors/microsoft-365/connect"
                    : "/apps/communications/mailboxes",
                primaryLabel: microsoftConnected
                  ? "Manage mailbox"
                  : microsoftPlatform?.configured
                    ? "Connect"
                    : "Open Mailboxes",
                secondaryHref: microsoftConnected ? "/apps/communications" : undefined,
                secondaryLabel: microsoftConnected ? "Open Inbox" : undefined,
              },
              {
                id: "apple-icloud",
                name: "Apple iCloud Mail",
                description: "Business iCloud mailbox via app-specific password.",
                status: icloudConnected ? "connected" : "not_connected",
                detail: icloudConnected
                  ? [
                      icloudEmail,
                      icloudLastSync
                        ? `Last synced ${new Date(icloudLastSync).toLocaleString("en-AU")}`
                        : "Connected — run Sync on Mailboxes if inbox is empty",
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : "Generate an app-specific password at appleid.apple.com, then connect on Mailboxes.",
                enables: "Inbox · Timeline",
                primaryHref: "/apps/communications/mailboxes",
                primaryLabel: icloudConnected ? "Manage mailbox" : "Connect",
                secondaryHref: icloudConnected ? "/apps/communications" : undefined,
                secondaryLabel: icloudConnected ? "Open Inbox" : undefined,
              },
              {
                id: "business-phone",
                name: "Business phone",
                description: "Your business numbers for Calls — DigitalGate manages the carrier connection.",
                status: "coming_next",
                detail: "Connect when Calls go live.",
                primaryHref: "/apps/communications/calls",
                primaryLabel: "View Calls",
              },
              {
                id: "sms",
                name: "SMS",
                description: "Business text messaging into Communications and Timeline.",
                status: "coming_next",
                detail: "Same Communication Record as email — not a separate messaging product.",
                primaryHref: "/apps/communications/sms",
                primaryLabel: "View SMS",
              },
              {
                id: "whatsapp",
                name: "WhatsApp Business",
                description: "Business messaging identity when supported.",
                status: "coming_next",
              },
            ],
          },
          {
            id: "web",
            title: "Web & digital presence",
            cards: [
              {
                id: "google-gbp",
                name: "Google Business Profile",
                description: "Locations, categories, and reviews for local presence.",
                status: gbpConnected ? "connected" : "not_connected",
                detail: gbpConnected
                  ? gbpLastSync
                    ? `Last synced ${new Date(gbpLastSync).toLocaleString("en-AU")}`
                    : "Connected"
                  : null,
                enables: "Reputation · Business Health · local visibility",
                primaryHref: gbpConnected
                  ? "/dashboard/settings/connectors"
                  : "/api/connectors/google/connect",
                primaryLabel: gbpConnected ? "Manage" : "Connect",
              },
              {
                id: "wordpress",
                name: "Website (WordPress)",
                description: "Optional bridge for sites still on WordPress.",
                status: "not_connected",
                detail: "Configure under advanced Connectors if needed.",
                primaryHref: "/dashboard/settings/connectors",
                primaryLabel: "Advanced",
              },
            ],
          },
          {
            id: "social",
            title: "Marketing & social",
            cards: [
              {
                id: "meta",
                name: "Facebook & Instagram",
                description: "Company pages and social presence.",
                status: "coming_next",
              },
              {
                id: "linkedin",
                name: "LinkedIn",
                description: "Company LinkedIn page and publishing.",
                status: "coming_next",
                detail: "Connector available for operators under advanced Connectors.",
                primaryHref: "/dashboard/settings/connectors",
                primaryLabel: "Advanced",
              },
              {
                id: "youtube",
                name: "YouTube",
                description: "Business channel connection.",
                status: "coming_next",
              },
              {
                id: "x",
                name: "X",
                description: "Business account connection.",
                status: "coming_next",
              },
            ],
          },
          {
            id: "finance",
            title: "Finance & commerce",
            cards: [
              {
                id: "stripe-org",
                name: "Stripe",
                description: "Payments and billing for your organisation.",
                status: "not_connected",
                detail: "Review under Billing — DigitalGate also uses Stripe for platform subscriptions.",
                primaryHref: "/dashboard/settings/billing",
                primaryLabel: "Open Billing",
              },
              {
                id: "xero",
                name: "Xero",
                description: "Accounting signals for Commerce and Business Health.",
                status: "coming_next",
              },
              {
                id: "shopify",
                name: "Shopify",
                description: "Store connection when commerce needs it.",
                status: "coming_next",
              },
            ],
          },
          {
            id: "industry",
            title: "Industry",
            cards: [
              {
                id: "domain",
                name: "Domain.com.au",
                description: "Agency Domain account for listings and enquiries.",
                status: "coming_next",
                detail: "Real Estate — connect under advanced Connectors when ready.",
                primaryHref: "/dashboard/settings/connectors",
                primaryLabel: "Advanced",
              },
              {
                id: "rea",
                name: "realestate.com.au",
                description: "Agency REA publishing account.",
                status: "coming_next",
                primaryHref: "/dashboard/settings/connectors",
                primaryLabel: "Advanced",
              },
              {
                id: "cotality",
                name: "Cotality / CoreLogic",
                description: "Property data for your agency.",
                status: "coming_next",
              },
            ],
          },
        ];

        if (!cancelled) setGroups(next);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load connections");
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="text-sm text-amber-400">{error}</p>;
  }

  if (!groups) {
    return <p className="text-sm text-slate-500">Loading connections…</p>;
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          DigitalGate platform
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Managed by DigitalGate — shared infrastructure that powers your organisation. You do not
          configure these APIs.
        </p>
        <ul className="mt-4 space-y-3">
          {PLATFORM_CAPABILITIES.map((card) => (
            <ServiceCardRow key={card.id} card={card} />
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Your business connections
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Connect the systems your business already uses. DigitalGate brings them into one connected
          operating layer.
        </p>
        <div className="mt-6 space-y-8">
          {groups.map((group) => (
            <div key={group.id}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                {group.title}
              </h3>
              <ul className="mt-3 space-y-3">
                {group.cards.map((card) => (
                  <ServiceCardRow key={card.id} card={card} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
