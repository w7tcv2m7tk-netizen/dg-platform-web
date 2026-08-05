"use client";

import { useState } from "react";
import {
  CONTACT_URL,
  SUPPORT_EMAIL,
  SUPPORT_MAILTO,
} from "@/lib/support";

export function SupportActions() {
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy support email:", SUPPORT_EMAIL);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <p className="font-mono text-sm text-slate-200">{SUPPORT_EMAIL}</p>
      <div className="flex flex-wrap gap-2">
        <a
          href={SUPPORT_MAILTO}
          className="inline-flex items-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
        >
          Open in email app
        </a>
        <button
          type="button"
          onClick={copyEmail}
          className="inline-flex items-center rounded-full border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:border-slate-500 hover:text-white"
        >
          {copied ? "Copied" : "Copy email"}
        </button>
      </div>
      <a
        href={CONTACT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-sm font-medium text-blue-400 hover:underline"
      >
        Contact form on digitalgate.com.au →
      </a>
    </div>
  );
}
