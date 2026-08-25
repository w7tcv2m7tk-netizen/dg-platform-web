"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ServiceCard = {
  id: string;
  name: string;
  description: string;
  status: "connected" | "not_connected" | "coming_next";
  detail?: string | null;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

function StatusDot({ status }: { status: ServiceCard["status"] }) {
  if (status === "connected") {
    return <span className="text-emerald-400">● Connected</span>;
  }
  if (status === "coming_next") {
    return <span className="text-slate-500">○ Coming next</span>;
  }
  return <span className="text-slate-400">○ Not connected</span>;
}

export function ConnectedServicesCatalog() {
  const [cards, setCards] = useState<ServiceCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setError(null);
      try {
        const [gmailRes, gbpRes] = await Promise.all([
          fetch("/api/v1/connectors/google-gmail/status"),
          fetch("/api/v1/connectors/google/status"),
        ]);
        const gmailJson = await gmailRes.json().catch(() => ({}));
        const gbpJson = await gbpRes.json().catch(() => ({}));

        const gmailOrg = gmailJson?.data?.organisation;
        const gbpOrg = gbpJson?.data?.organisation;
        const gmailConnected = Boolean(gmailOrg?.connected);
        const gbpConnected = Boolean(gbpOrg?.connected);
        const gmailEmail = gmailOrg?.email as string | null | undefined;
        const gmailLastSync = gmailOrg?.health?.lastSyncAt as string | null | undefined;
        const gbpLastSync = gbpOrg?.health?.lastSyncAt as string | null | undefined;

        const next: ServiceCard[] = [
          {
            id: "google-workspace",
            name: "Google Workspace / Gmail",
            description: "Sync inbox and sent mail into Communications History.",
            status: gmailConnected ? "connected" : "not_connected",
            detail: gmailConnected
              ? [
                  gmailEmail,
                  gmailLastSync
                    ? `Last synchronised ${new Date(gmailLastSync).toLocaleString("en-AU")}`
                    : "Connected — run Sync on Mailboxes if inbox is empty",
                ]
                  .filter(Boolean)
                  .join(" · ")
              : null,
            primaryHref: gmailConnected
              ? "/apps/communications/mailboxes"
              : "/api/connectors/google-gmail/connect",
            primaryLabel: gmailConnected ? "Manage mailbox" : "Connect",
            secondaryHref: gmailConnected ? "/apps/communications/inbox" : undefined,
            secondaryLabel: gmailConnected ? "Open Inbox" : undefined,
          },
          {
            id: "google-gbp",
            name: "Google Business Profile",
            description: "Locations and profile fields for your business presence.",
            status: gbpConnected ? "connected" : "not_connected",
            detail: gbpConnected
              ? gbpLastSync
                ? `Last synchronised ${new Date(gbpLastSync).toLocaleString("en-AU")}`
                : "Connected"
              : null,
            primaryHref: gbpConnected
              ? "/dashboard/settings/connectors"
              : "/api/connectors/google/connect",
            primaryLabel: gbpConnected ? "Manage" : "Connect",
          },
          {
            id: "microsoft-365",
            name: "Microsoft 365",
            description: "Outlook mail, calendar, and contacts — same pattern as Google.",
            status: "coming_next",
            detail: "Prioritised after Google Workspace.",
          },
          {
            id: "business-phone",
            name: "Business phone",
            description: "Calls and SMS for your business numbers — DigitalGate manages the connection.",
            status: "coming_next",
            detail: "Connect your business phone when SMS and Calls go live.",
            primaryHref: "/apps/communications/calls",
            primaryLabel: "View Calls",
          },
          {
            id: "sms",
            name: "SMS",
            description: "Business text messaging into Communications Inbox and Timeline.",
            status: "coming_next",
            detail: "Same Communication Record as email — not a separate messaging product.",
            primaryHref: "/apps/communications/sms",
            primaryLabel: "View SMS",
          },
          {
            id: "stripe",
            name: "Stripe",
            description: "Billing and payments for your organisation.",
            status: "not_connected",
            detail: "Connect or review under Billing.",
            primaryHref: "/dashboard/settings/billing",
            primaryLabel: "Open Billing",
          },
          {
            id: "wordpress",
            name: "WordPress",
            description: "Optional legacy bridge for sites still on WordPress.",
            status: "not_connected",
            detail: "Configure under advanced Connectors if needed.",
            primaryHref: "/dashboard/settings/connectors",
            primaryLabel: "Advanced connectors",
          },
        ];

        if (!cancelled) setCards(next);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load services");
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

  if (!cards) {
    return <p className="text-sm text-slate-500">Loading connected services…</p>;
  }

  return (
    <ul className="space-y-3">
      {cards.map((card) => (
        <li
          key={card.id}
          className="rounded-xl border border-slate-700/70 bg-slate-950/40 px-4 py-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium text-white">{card.name}</p>
              <p className="mt-1 text-sm text-slate-400">{card.description}</p>
              <p className="mt-2 text-xs">
                <StatusDot status={card.status} />
              </p>
              {card.detail ? (
                <p className="mt-1 text-xs text-slate-500">{card.detail}</p>
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
      ))}
    </ul>
  );
}
