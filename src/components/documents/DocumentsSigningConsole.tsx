"use client";

import { useMemo, useState } from "react";

export type SigningConsoleDocument = {
  id: string;
  name: string;
  kind: string;
  signingStatus: string;
  signingProvider: string;
  updatedAt: string;
};

type Signer = { name: string; email: string };

type SigningRequestView = {
  externalId: string;
  status: string;
  sentAt: string;
  completedAt?: string;
  testMode?: boolean;
  recipients?: Array<{
    role: string;
    name?: string;
    email: string;
    status: string;
    signedAt?: string;
  }>;
};

function statusLabel(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusClass(status: string) {
  if (status === "completed") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  if (status === "declined" || status === "expired")
    return "border-rose-500/30 bg-rose-500/10 text-rose-200";
  if (status === "sent" || status === "viewed")
    return "border-sky-500/30 bg-sky-500/10 text-sky-200";
  return "border-slate-600 bg-slate-900/60 text-slate-300";
}

export function DocumentsSigningConsole({
  initialDocuments,
  providerConfigured,
}: {
  initialDocuments: SigningConsoleDocument[];
  providerConfigured: boolean;
}) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [selectedId, setSelectedId] = useState(
    initialDocuments.find((doc) => !["sent", "viewed", "completed"].includes(doc.signingStatus))?.id ??
      initialDocuments[0]?.id ??
      "",
  );
  const [signers, setSigners] = useState<Signer[]>([{ name: "", email: "" }]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [requestView, setRequestView] = useState<SigningRequestView | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const selected = useMemo(
    () => documents.find((doc) => doc.id === selectedId) ?? null,
    [documents, selectedId],
  );
  const canSend =
    Boolean(selected) &&
    providerConfigured &&
    !["sent", "viewed", "completed"].includes(selected?.signingStatus ?? "");

  function updateSigner(index: number, patch: Partial<Signer>) {
    setSigners((current) =>
      current.map((signer, signerIndex) => (signerIndex === index ? { ...signer, ...patch } : signer)),
    );
  }

  async function sendForSignature() {
    if (!selected || !canSend || sending) return;
    setSending(true);
    setFeedback("");
    setRequestView(null);
    try {
      const response = await fetch(`/api/v1/documents/${selected.id}/signing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signers, subject, message }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFeedback(json.error?.message || "Could not send this document for signature.");
        return;
      }
      const request = json.data?.request as SigningRequestView | undefined;
      setDocuments((current) =>
        current.map((doc) =>
          doc.id === selected.id
            ? { ...doc, signingStatus: request?.status ?? "sent", signingProvider: "dropbox_sign" }
            : doc,
        ),
      );
      setRequestView(request ?? null);
      setFeedback(
        request?.testMode
          ? "Test signature request sent. Test-mode signatures are not legally binding."
          : "Signature request sent.",
      );
    } catch {
      setFeedback("Could not reach the signing service. Try again.");
    } finally {
      setSending(false);
    }
  }

  async function loadDetails(documentId: string) {
    setSelectedId(documentId);
    setLoadingDetails(true);
    setFeedback("");
    try {
      const response = await fetch(`/api/v1/documents/${documentId}/signing`, { cache: "no-store" });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFeedback(json.error?.message || "Could not load signing details.");
        return;
      }
      setRequestView((json.data?.request as SigningRequestView | null) ?? null);
    } catch {
      setFeedback("Could not load signing details.");
    } finally {
      setLoadingDetails(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
      <section className="dg-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-white">Signing queue</h2>
            <p className="mt-1 text-sm text-slate-400">
              Send prepared documents, track signer progress and retain the final signed PDF in Documents.
            </p>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-xs ${
              providerConfigured
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : "border-amber-500/30 bg-amber-500/10 text-amber-200"
            }`}
          >
            {providerConfigured ? "Dropbox Sign connected" : "Signing provider not configured"}
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-400">
            No documents yet. Upload or create a document in the Library first.
          </div>
        ) : (
          <div className="mt-5 overflow-hidden rounded-xl border border-slate-800">
            {documents.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => void loadDetails(doc.id)}
                className={`flex min-h-16 w-full items-center justify-between gap-4 border-b border-slate-800 px-4 py-3 text-left last:border-b-0 hover:bg-slate-900/60 ${
                  selectedId === doc.id ? "bg-slate-900/80" : "bg-slate-950/30"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-white">{doc.name}</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {statusLabel(doc.kind)} · {doc.signingProvider === "manual_upload" ? "Manual" : statusLabel(doc.signingProvider)}
                  </span>
                </span>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs ${statusClass(doc.signingStatus)}`}>
                  {statusLabel(doc.signingStatus)}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="dg-card">
        <h2 className="font-semibold text-white">{selected ? "Send / track" : "Select a document"}</h2>
        {selected ? (
          <>
            <p className="mt-1 text-sm text-slate-400">{selected.name}</p>

            {requestView ? (
              <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-white">Current request</p>
                  <span className={`rounded-full border px-2.5 py-1 text-xs ${statusClass(requestView.status)}`}>
                    {statusLabel(requestView.status)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Sent {new Date(requestView.sentAt).toLocaleString("en-AU")}
                  {requestView.testMode ? " · Test mode" : ""}
                </p>
                {requestView.recipients?.length ? (
                  <ul className="mt-4 space-y-2">
                    {requestView.recipients.map((recipient, index) => (
                      <li key={`${recipient.email}-${index}`} className="rounded-lg border border-slate-800 px-3 py-2 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="min-w-0 truncate text-slate-200">
                            {recipient.name || recipient.email}
                          </span>
                          <span className="text-xs text-slate-400">{statusLabel(recipient.status)}</span>
                        </div>
                        {recipient.name ? <p className="mt-0.5 truncate text-xs text-slate-500">{recipient.email}</p> : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : loadingDetails ? (
              <p className="mt-5 text-sm text-slate-500">Loading signing details…</p>
            ) : null}

            {!providerConfigured ? (
              <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
                Digital signing is installed but not active. Configure Dropbox Sign credentials before sending live or test requests.
              </div>
            ) : !["sent", "viewed", "completed"].includes(selected.signingStatus) ? (
              <div className="mt-5 space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-medium text-slate-300">Signers</label>
                    {signers.length < 10 ? (
                      <button
                        type="button"
                        onClick={() => setSigners((current) => [...current, { name: "", email: "" }])}
                        className="text-xs text-sky-400 hover:underline"
                      >
                        + Add signer
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-2 space-y-3">
                    {signers.map((signer, index) => (
                      <div key={index} className="grid gap-2 sm:grid-cols-2">
                        <input
                          value={signer.name}
                          onChange={(event) => updateSigner(index, { name: event.target.value })}
                          placeholder="Signer name"
                          className="min-h-11 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-white placeholder:text-slate-600"
                        />
                        <input
                          type="email"
                          value={signer.email}
                          onChange={(event) => updateSigner(index, { email: event.target.value })}
                          placeholder="name@example.com"
                          className="min-h-11 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-white placeholder:text-slate-600"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <label className="block text-sm">
                  <span className="text-slate-400">Email subject (optional)</span>
                  <input
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder={`Please sign ${selected.name}`}
                    className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-white placeholder:text-slate-600"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-slate-400">Message (optional)</span>
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-white"
                  />
                </label>
                <button
                  type="button"
                  disabled={!canSend || sending}
                  onClick={() => void sendForSignature()}
                  className="min-h-11 rounded-full bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? "Sending…" : "Send for signature →"}
                </button>
              </div>
            ) : null}

            {feedback ? <p className="mt-4 text-sm text-slate-300" role="status">{feedback}</p> : null}
          </>
        ) : (
          <p className="mt-3 text-sm text-slate-400">Choose a document from the signing queue.</p>
        )}
      </section>
    </div>
  );
}
