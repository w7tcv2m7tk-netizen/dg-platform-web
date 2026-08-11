"use client";



import { useRouter } from "next/navigation";

import { useState } from "react";



type CotalitySections = {

  core?: string;

  additional?: string;

  site?: string;

  lastSale?: string;

  features?: string;

  avm?: string;

};



type CotalityDetailsSummary = {

  fetchedAt?: string | null;

  propertyType?: string | null;

  beds?: number | null;

  baths?: number | null;

  carSpaces?: number | null;

  landArea?: number | null;

  floorArea?: number | null;

  yearBuilt?: string | number | null;

  lastSalePrice?: number | null;

  lastSaleDate?: string | null;

  avmAvailable?: boolean;

  avmMessage?: string | null;

  sections?: CotalitySections | null;

};



type CotalityMatchPanelProps = {

  propertyId: string;

  cotalityPropertyId?: string | number | null;

  matchType?: string | null;

  matchedAddress?: string | null;

  details?: CotalityDetailsSummary | null;

  defaultReportEmail?: string | null;

};



function formatAud(n: number | null | undefined) {

  if (n == null || !Number.isFinite(n)) return null;

  return `$${n.toLocaleString("en-AU")}`;

}



export function CotalityMatchPanel({

  propertyId,

  cotalityPropertyId,

  matchType,

  matchedAddress,

  details,

  defaultReportEmail,

}: CotalityMatchPanelProps) {

  const router = useRouter();

  const [pending, setPending] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [message, setMessage] = useState<string | null>(null);

  const [reportPreview, setReportPreview] = useState<string | null>(null);

  const [email, setEmail] = useState(defaultReportEmail ?? "");



  const matched = cotalityPropertyId != null && cotalityPropertyId !== "";

  const hasDetails = Boolean(details?.fetchedAt);



  async function runMatch() {

    setPending("match");

    setError(null);

    setMessage(null);



    const res = await fetch(`/api/v1/properties/${propertyId}`, {

      method: "PATCH",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({ action: "match_cotality", pullDetails: true }),

    });



    const json = await res.json().catch(() => null);

    setPending(null);



    if (!res.ok) {

      setError(json?.error?.message ?? "Cotality match failed");

      return;

    }



    if (json?.meta?.matched) {

      const pulled = json?.meta?.detailsPulled

        ? " · details pulled"

        : json?.meta?.detailsError

          ? ` · details: ${json.meta.detailsError}`

          : "";

      setMessage(

        `Matched · Cotality id ${String(json.meta.cotalityPropertyId)}${pulled}`,

      );

    } else {

      setMessage(json?.meta?.message ?? "No Cotality property id for this address");

    }

    router.refresh();

  }



  async function pullDetails() {

    setPending("pull");

    setError(null);

    setMessage(null);



    const res = await fetch(`/api/v1/properties/${propertyId}`, {

      method: "PATCH",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({ action: "pull_cotality" }),

    });

    const json = await res.json().catch(() => null);

    setPending(null);



    if (!res.ok) {

      setError(json?.error?.message ?? "Cotality pull failed");

      return;

    }



    setMessage(

      `Details pulled · ${new Date(json?.meta?.fetchedAt ?? Date.now()).toLocaleString("en-AU")}`,

    );

    router.refresh();

  }



  async function generateReport(send: boolean) {

    setPending(send ? "send" : "report");

    setError(null);

    setMessage(null);

    setReportPreview(null);



    const res = await fetch("/api/v1/re/reports", {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({

        action: "property_report",

        propertyId,

        refreshCotality: true,

        ...(send && email.trim() ? { to: email.trim() } : {}),

      }),

    });

    const json = await res.json().catch(() => null);

    setPending(null);



    if (!res.ok) {

      setError(json?.error?.message ?? "Report generation failed");

      return;

    }



    const markdown = json?.data?.markdown as string | undefined;

    if (markdown) setReportPreview(markdown);



    if (send) {

      const status = json?.data?.delivery?.status ?? "queued";

      setMessage(`Report ${status} → ${email.trim()}`);

    } else {

      setMessage(

        json?.data?.report?.partial

          ? "Report ready (partial — some Cotality sections unavailable)"

          : "Report ready",

      );

    }

    router.refresh();

  }



  return (

    <div className="mt-4 border-t border-slate-800 pt-4">

      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">

        Cotality

      </p>

      {matched ? (

        <div className="mt-2 space-y-1">

          <p className="text-sm text-slate-300">

            Matched

            {matchType ? (

              <span className="text-slate-500"> · type {matchType}</span>

            ) : null}

          </p>

          <p className="font-mono text-xs text-slate-500">

            id {String(cotalityPropertyId)}

          </p>

          {matchedAddress ? (

            <p className="text-xs text-slate-500">{matchedAddress}</p>

          ) : null}



          {hasDetails ? (

            <div className="mt-3 space-y-1 rounded-md border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-400">

              <p className="text-slate-300">

                Details

                {details?.fetchedAt

                  ? ` · ${new Date(details.fetchedAt).toLocaleString("en-AU")}`

                  : ""}

              </p>

              {details?.propertyType ? (

                <p>Type: {details.propertyType}</p>

              ) : null}

              <p>

                {[

                  details?.beds != null ? `${details.beds} bed` : null,

                  details?.baths != null ? `${details.baths} bath` : null,

                  details?.carSpaces != null ? `${details.carSpaces} car` : null,

                  details?.landArea != null ? `${details.landArea} m² land` : null,

                  details?.floorArea != null

                    ? `${details.floorArea} m² floor`

                    : null,

                  details?.yearBuilt != null ? `built ${details.yearBuilt}` : null,

                ]

                  .filter(Boolean)

                  .join(" · ") || "Attribute fields empty or partial"}

              </p>

              {details?.lastSalePrice != null || details?.lastSaleDate ? (

                <p>

                  Last sale:{" "}

                  {[formatAud(details.lastSalePrice), details.lastSaleDate]

                    .filter(Boolean)

                    .join(" · ")}

                </p>

              ) : (

                <p>Last sale: not returned</p>

              )}

              <p>

                AVM:{" "}

                {details?.avmAvailable

                  ? "available"

                  : details?.avmMessage || "not available for this property"}

              </p>

              <p className="text-[11px] text-slate-600">

                Honest Cotality sandbox/UAT data only — empty sections are not filled in.

              </p>

            </div>

          ) : (

            <p className="mt-2 text-xs text-slate-500">

              Matched id on file — pull Property Details to load attributes for reports.

            </p>

          )}



          <div className="mt-3 flex flex-wrap gap-2">

            <button

              type="button"

              onClick={() => void pullDetails()}

              disabled={pending != null}

              className="rounded-full border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-500 hover:text-white disabled:opacity-50"

            >

              {pending === "pull" ? "Pulling…" : hasDetails ? "Refresh details" : "Pull details"}

            </button>

            <button

              type="button"

              onClick={() => void runMatch()}

              disabled={pending != null}

              className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:border-slate-500 hover:text-slate-200 disabled:opacity-50"

            >

              {pending === "match" ? "Re-matching…" : "Re-match"}

            </button>

          </div>



          <div className="mt-4 space-y-2 border-t border-slate-800 pt-3">

            <p className="text-xs font-medium text-slate-400">Property report</p>

            <p className="text-[11px] text-slate-500">

              Generate from Cotality fields + org branding. Send when someone requests a

              report (WP form still captures the lead).

            </p>

            <input

              type="email"

              value={email}

              onChange={(e) => setEmail(e.target.value)}

              placeholder="Recipient email"

              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600"

            />

            <div className="flex flex-wrap gap-2">

              <button

                type="button"

                onClick={() => void generateReport(false)}

                disabled={pending != null}

                className="rounded-full border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-500 disabled:opacity-50"

              >

                {pending === "report" ? "Generating…" : "Generate report"}

              </button>

              <button

                type="button"

                onClick={() => void generateReport(true)}

                disabled={pending != null || !email.trim()}

                className="rounded-full bg-emerald-700/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"

              >

                {pending === "send" ? "Sending…" : "Generate & send"}

              </button>

            </div>

          </div>

        </div>

      ) : (

        <div className="mt-2">

          <p className="text-sm text-slate-400">Not matched yet</p>

          <button

            type="button"

            onClick={() => void runMatch()}

            disabled={pending != null}

            className="mt-3 rounded-full border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:border-slate-500 hover:text-white disabled:opacity-50"

          >

            {pending === "match" ? "Matching…" : "Match with Cotality"}

          </button>

        </div>

      )}

      {message ? <p className="mt-2 text-sm text-emerald-400/90">{message}</p> : null}

      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}

      {reportPreview ? (

        <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-slate-800 bg-slate-950/60 p-3 text-[11px] leading-relaxed text-slate-400">

          {reportPreview}

        </pre>

      ) : null}

    </div>

  );

}


