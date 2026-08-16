"use client";

import { useState, type CSSProperties, type FormEvent } from "react";

type Props = {
  siteSlug: string;
  basePath?: string;
};

type Step = "website" | "contact" | "done";

export function BusinessAuditCapture({ siteSlug, basePath = "" }: Props) {
  const [step, setStep] = useState<Step>("website");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [normalisedUrl, setNormalisedUrl] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{
    type: "error" | "ok" | "loading";
    text: string;
  } | null>(null);
  const [doneMessage, setDoneMessage] = useState("");
  const [overallScore, setOverallScore] = useState<number | null>(null);

  const strategyHref =
    basePath && basePath !== "/"
      ? `${basePath}/strategy-session`
      : "/strategy-session";

  async function onWebsiteSubmit(e: FormEvent) {
    e.preventDefault();
    const raw = websiteUrl.trim();
    const biz = businessName.trim();
    if (!raw) {
      setStatus({ type: "error", text: "Enter your website URL." });
      return;
    }
    if (!biz) {
      setStatus({ type: "error", text: "Enter your business name." });
      return;
    }
    setBusy(true);
    setStatus({ type: "loading", text: "Checking your website…" });
    try {
      const res = await fetch("/api/public/business-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "probe",
          siteSlug,
          websiteUrl: raw,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        data?: {
          websiteUrl?: string;
          reachable?: boolean | null;
          title?: string | null;
        };
        error?: { message?: string };
      };
      if (!res.ok) {
        setStatus({
          type: "error",
          text: json?.error?.message || "Could not check that website.",
        });
        setBusy(false);
        return;
      }
      const next = json?.data?.websiteUrl?.trim() || raw;
      setNormalisedUrl(next);
      setWebsiteUrl(next);
      if (json?.data?.title && !businessName.trim()) {
        setBusinessName(json.data.title);
      }
      setStatus(
        json?.data?.reachable === false
          ? {
              type: "ok",
              text: "We couldn't reach that site just now — you can still continue and we'll note it in your audit.",
            }
          : null,
      );
      setStep("contact");
    } catch {
      setStatus({ type: "error", text: "Network error. Please try again." });
    }
    setBusy(false);
  }

  async function onContactSubmit(e: FormEvent) {
    e.preventDefault();
    const name = fullName.trim();
    if (!name) {
      setStatus({ type: "error", text: "Please enter your full name." });
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setStatus({
        type: "error",
        text: "Please provide either an email or mobile number.",
      });
      return;
    }
    setBusy(true);
    setStatus({
      type: "loading",
      text: "Running your Business Audit…",
    });
    try {
      const res = await fetch("/api/public/business-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          siteSlug,
          websiteUrl: normalisedUrl || websiteUrl,
          businessName: businessName.trim(),
          fullName: name,
          email: email.trim(),
          phone: phone.trim(),
          websiteHp: honeypot,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        data?: {
          message?: string;
          overallScore?: number;
          auditSent?: boolean;
        };
        error?: { message?: string };
      };
      if (!res.ok) {
        setStatus({
          type: "error",
          text: json?.error?.message || "Something went wrong.",
        });
        setBusy(false);
        return;
      }
      setOverallScore(
        typeof json?.data?.overallScore === "number"
          ? json.data.overallScore
          : null,
      );
      setDoneMessage(
        json?.data?.message ||
          "Your Business Audit is on its way — check your inbox shortly.",
      );
      setStatus(null);
      setStep("done");
    } catch {
      setStatus({ type: "error", text: "Network error. Please try again." });
    }
    setBusy(false);
  }

  const fieldStyle: CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "0.75rem 0.85rem",
    borderRadius: "0.5rem",
    border: "1px solid #334155",
    marginBottom: "0.85rem",
    fontSize: "1rem",
    background: "#0f172a",
    color: "#e2e8f0",
  };
  const labelStyle: CSSProperties = {
    display: "block",
    fontSize: "0.8rem",
    fontWeight: 600,
    marginBottom: "0.35rem",
    color: "#94a3b8",
  };
  const btnStyle: CSSProperties = {
    width: "100%",
    padding: "0.85rem 1rem",
    borderRadius: "999px",
    border: "none",
    background: "#3B82F6",
    color: "#fff",
    fontWeight: 600,
    fontSize: "0.95rem",
    cursor: busy ? "wait" : "pointer",
  };

  return (
    <section
      id="business-audit-form"
      className="dg-business-audit-capture"
      style={{
        background: "linear-gradient(180deg, #0b1220 0%, #111827 100%)",
        color: "#e2e8f0",
        padding: "3.5rem clamp(1rem, 3vw, 2.5rem)",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "34rem",
          margin: "0 auto",
          background: "rgba(15, 23, 42, 0.9)",
          borderRadius: "1rem",
          padding: "1.85rem 1.5rem",
          border: "1px solid rgba(148, 163, 184, 0.2)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
        }}
      >
        {step === "website" ? (
          <>
            <p
              style={{
                margin: "0 0 0.5rem",
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#60A5FA",
              }}
            >
              Free Business Audit
            </p>
            <h3
              style={{
                margin: "0 0 0.4rem",
                fontSize: "1.45rem",
                color: "#fff",
              }}
            >
              Get your free Business Audit
            </h3>
            <p style={{ margin: "0 0 1.25rem", color: "#94a3b8", fontSize: "0.95rem" }}>
              Enter your website — we&apos;ll scan live presence signals and email your report.
            </p>
            <form onSubmit={(e) => void onWebsiteSubmit(e)}>
              <label htmlFor="dgBaUrl" style={labelStyle}>
                Website URL
              </label>
              <input
                id="dgBaUrl"
                type="text"
                required
                value={websiteUrl}
                disabled={busy}
                placeholder="e.g. youragency.com.au"
                onChange={(e) => setWebsiteUrl(e.target.value)}
                style={fieldStyle}
              />
              <label htmlFor="dgBaBiz" style={labelStyle}>
                Business name
              </label>
              <input
                id="dgBaBiz"
                type="text"
                required
                value={businessName}
                disabled={busy}
                placeholder="Your agency or business name"
                onChange={(e) => setBusinessName(e.target.value)}
                style={fieldStyle}
              />
              <button type="submit" disabled={busy} style={btnStyle}>
                {busy ? "Checking website…" : "Continue"}
              </button>
            </form>
          </>
        ) : null}

        {step === "contact" ? (
          <>
            <h3
              style={{
                margin: "0 0 0.4rem",
                fontSize: "1.35rem",
                color: "#fff",
              }}
            >
              Where should we send your audit?
            </h3>
            <p
              style={{
                margin: "0 0 1rem",
                padding: "0.65rem 0.75rem",
                background: "rgba(59, 130, 246, 0.12)",
                borderRadius: "0.5rem",
                fontSize: "0.9rem",
                color: "#bfdbfe",
              }}
            >
              {businessName}
              {normalisedUrl ? ` · ${normalisedUrl}` : ""}
              <button
                type="button"
                onClick={() => {
                  setStep("website");
                  setStatus(null);
                }}
                style={{
                  marginLeft: "0.75rem",
                  border: "none",
                  background: "transparent",
                  color: "#93c5fd",
                  textDecoration: "underline",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                }}
              >
                Change
              </button>
            </p>
            <form onSubmit={(e) => void onContactSubmit(e)}>
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: "-9999px",
                  height: 0,
                  overflow: "hidden",
                }}
              >
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>
              <label htmlFor="dgBaName" style={labelStyle}>
                Full name
              </label>
              <input
                id="dgBaName"
                type="text"
                required
                value={fullName}
                disabled={busy}
                onChange={(e) => setFullName(e.target.value)}
                style={fieldStyle}
              />
              <label htmlFor="dgBaEmail" style={labelStyle}>
                Email
              </label>
              <input
                id="dgBaEmail"
                type="email"
                value={email}
                disabled={busy}
                onChange={(e) => setEmail(e.target.value)}
                style={fieldStyle}
              />
              <label htmlFor="dgBaPhone" style={labelStyle}>
                Mobile
              </label>
              <input
                id="dgBaPhone"
                type="tel"
                value={phone}
                disabled={busy}
                onChange={(e) => setPhone(e.target.value)}
                style={{ ...fieldStyle, marginBottom: "1rem" }}
              />
              <button type="submit" disabled={busy} style={btnStyle}>
                {busy ? "Generating audit…" : "Send My Audit"}
              </button>
            </form>
          </>
        ) : null}

        {step === "done" ? (
          <div style={{ textAlign: "center" }}>
            <h3
              style={{
                margin: "0 0 0.75rem",
                fontSize: "1.35rem",
                color: "#fff",
              }}
            >
              You&apos;re all set
            </h3>
            {overallScore != null ? (
              <p
                style={{
                  margin: "0 0 0.75rem",
                  fontSize: "2rem",
                  fontWeight: 700,
                  color: "#60A5FA",
                }}
              >
                {overallScore}
                <span style={{ fontSize: "1rem", color: "#94a3b8" }}>/100</span>
              </p>
            ) : null}
            <p
              style={{
                margin: "0 0 1.25rem",
                color: "#cbd5e1",
                lineHeight: 1.55,
              }}
            >
              {doneMessage}
            </p>
            <a
              href={strategyHref}
              style={{
                display: "inline-flex",
                padding: "0.75rem 1.25rem",
                borderRadius: "999px",
                background: "#3B82F6",
                color: "#fff",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Book a strategy session
            </a>
          </div>
        ) : null}

        {status ? (
          <p
            role="status"
            aria-live="polite"
            style={{
              margin: "1rem 0 0",
              fontSize: "0.9rem",
              color:
                status.type === "error"
                  ? "#fca5a5"
                  : status.type === "ok"
                    ? "#86efac"
                    : "#94a3b8",
            }}
          >
            {status.text}
          </p>
        ) : null}
      </div>
    </section>
  );
}
