"use client";

import { useEffect, useState } from "react";

type ProviderState = {
  connected: boolean;
  configured: boolean;
  email?: string | null;
};

type WorkAccountState = {
  google: ProviderState;
  microsoft: ProviderState;
  apple: ProviderState;
};

const EMPTY: WorkAccountState = {
  google: { connected: false, configured: true },
  microsoft: { connected: false, configured: false },
  apple: { connected: false, configured: true },
};

export function VipWorkAccountConnections() {
  const [state, setState] = useState<WorkAccountState>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [googleRes, microsoftRes, appleRes] = await Promise.all([
          fetch("/api/v1/connectors/google-gmail/status"),
          fetch("/api/v1/connectors/microsoft-365/status"),
          fetch("/api/v1/connectors/apple-icloud/status"),
        ]);
        const [googleJson, microsoftJson, appleJson] = await Promise.all([
          googleRes.json().catch(() => ({})),
          microsoftRes.json().catch(() => ({})),
          appleRes.json().catch(() => ({})),
        ]);
        if (cancelled) return;
        setState({
          google: {
            connected: Boolean(googleJson?.data?.organisation?.connected),
            configured: googleRes.ok,
            email: googleJson?.data?.organisation?.email ?? null,
          },
          microsoft: {
            connected: Boolean(microsoftJson?.data?.organisation?.connected),
            configured: Boolean(microsoftJson?.data?.platform?.configured),
            email: microsoftJson?.data?.organisation?.email ?? null,
          },
          apple: {
            connected: Boolean(appleJson?.data?.organisation?.connected),
            configured: appleRes.ok,
            email: appleJson?.data?.organisation?.email ?? null,
          },
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const accounts = [
    {
      id: "google",
      label: "Google Workspace / Gmail",
      detail: "Connect the business mailbox now. Contacts and calendar remain clearly separated until their sync services are enabled.",
      state: state.google,
      href: "/api/connectors/google-gmail/connect",
      action: "Connect Google mail",
    },
    {
      id: "microsoft",
      label: "Microsoft 365 / Outlook",
      detail: "Connect the business mailbox through Microsoft Graph when the organisation connector is configured.",
      state: state.microsoft,
      href: state.microsoft.configured ? "/api/connectors/microsoft-365/connect" : "/dashboard/settings/connected-services",
      action: state.microsoft.configured ? "Connect Microsoft mail" : "Review Microsoft setup",
    },
    {
      id: "apple",
      label: "Apple / iCloud Mail",
      detail: "Connect an iCloud mailbox with an Apple app-specific password from the Communications mailbox setup.",
      state: state.apple,
      href: "/apps/communications/mailboxes",
      action: "Set up iCloud mail",
    },
  ];

  return (
    <div className="mt-4 border-t border-white/[0.07] pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-white">Connect available work accounts</p>
          <p className="mt-1 text-xs text-white/45">DigitalGate checks the real organisation connection state before showing anything as connected.</p>
        </div>
        {loading ? <span className="text-xs text-white/35">Checking connections…</span> : null}
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        {accounts.map((account) => (
          <div key={account.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-white">{account.label}</p>
              <span className={`text-[11px] font-medium ${account.state.connected ? "text-emerald-300" : "text-white/35"}`}>
                {account.state.connected ? "● Connected" : "○ Not connected"}
              </span>
            </div>
            {account.state.email ? <p className="mt-1 break-all text-xs text-emerald-200/70">{account.state.email}</p> : null}
            <p className="mt-2 text-xs leading-5 text-white/45">{account.detail}</p>
            <a href={account.href} className="mt-3 inline-flex min-h-11 items-center rounded-full border border-sky-400/30 bg-sky-500/10 px-4 text-xs font-medium text-sky-200 hover:bg-sky-500/15">
              {account.state.connected ? "Manage connection" : account.action}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
