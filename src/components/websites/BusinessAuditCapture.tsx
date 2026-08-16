"use client";

import { useState, type CSSProperties, type FormEvent } from "react";

type Props = {
  siteSlug: string;
  basePath?: string;
  /** Dedicated subdomain funnel vs embedded brand-site page. */
  variant?: "funnel" | "embedded";
};

type Step = "website" | "preview" | "contact" | "done";

type Pillars = {
  websiteHealth: number;
  searchVisibility: number;
  aiVisibility: number;
  reputation: number;
  conversionReadiness: number;
  growthSignals: number;
};

type Opportunity = {
  title: string;
  detail: string;
  severity: "critical" | "warning" | "opportunity";
  recommendedAction?: string;
};

const PILLAR_LABELS: { key: keyof Pillars; label: string }[] = [
  { key: "websiteHealth", label: "Website Health" },
  { key: "searchVisibility", label: "Search Visibility" },
  { key: "aiVisibility", label: "AI Visibility" },
  { key: "reputation", label: "Reputation" },
  { key: "conversionReadiness", label: "Conversion Readiness" },
];

const INDUSTRIES = [
  "Real estate",
  "Professional services",
  "Trades & home services",
  "Hospitality & tourism",
  "Health & wellness",
  "Retail & e‑commerce",
  "Construction & development",
  "Other",
];

function scoreColor(n: number) {
  if (n >= 75) return "#4ade80";
  if (n >= 55) return "#60A5FA";
  if (n >= 40) return "#fbbf24";
  return "#f87171";
}

export function BusinessAuditCapture({
  siteSlug,
  basePath = "",
  variant = "embedded",
}: Props) {
  const isFunnel = variant === "funnel";
  const [step, setStep] = useState<Step>("website");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [normalisedUrl, setNormalisedUrl] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
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
  const [pillars, setPillars] = useState<Pillars | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);

  const strategyHref =
    basePath && basePath !== "/"
      ? `${basePath}/strategy-session`
      : "https://digitalgate.com.au/strategy-session";
  const brandHref = "https://digitalgate.com.au";

  async function onWebsiteSubmit(e: FormEvent) {
    e.preventDefault();
    const raw = websiteUrl.trim();
    if (!raw) {
      setStatus({ type: "error", text: "Enter your website URL." });
      return;
    }
    setBusy(true);
    setStatus({
      type: "loading",
      text: "DigitalGate is scanning your business…",
    });
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
          overallScore?: number;
          pillars?: Pillars;
          opportunities?: Opportunity[];
        };
        error?: { message?: string };
      };
      if (!res.ok) {
        setStatus({
          type: "error",
          text: json?.error?.message || "Could not scan that website.",
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
      setOverallScore(
        typeof json?.data?.overallScore === "number"
          ? json.data.overallScore
          : null,
      );
      setPillars(json?.data?.pillars ?? null);
      setOpportunities(json?.data?.opportunities ?? []);
      setStatus(
        json?.data?.reachable === false
          ? {
              type: "ok",
              text: "We couldn't reach that site just now — scores may be limited, but you can still continue.",
            }
          : null,
      );
      setStep("preview");
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
    if (!email.trim()) {
      setStatus({
        type: "error",
        text: "Email is required to send your full report.",
      });
      return;
    }
    if (!businessName.trim()) {
      setStatus({ type: "error", text: "Please enter your business name." });
      return;
    }
    setBusy(true);
    setStatus({
      type: "loading",
      text: "Preparing your DigitalGate Business Audit™…",
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
          industry: industry.trim(),
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
          pillars?: Pillars;
          opportunities?: Opportunity[];
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
      if (typeof json?.data?.overallScore === "number") {
        setOverallScore(json.data.overallScore);
      }
      if (json?.data?.pillars) setPillars(json.data.pillars);
      if (json?.data?.opportunities) setOpportunities(json.data.opportunities);
      setDoneMessage(
        json?.data?.message ||
          "Your DigitalGate Business Audit™ is on its way — check your inbox shortly.",
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
      className={
        isFunnel
          ? "dg-business-audit-capture dg-business-audit-funnel"
          : "dg-business-audit-capture"
      }
      style={{
        minHeight: isFunnel ? "100vh" : undefined,
        background: "linear-gradient(180deg, #0b1220 0%, #111827 100%)",
        color: "#e2e8f0",
        padding: isFunnel
          ? "2rem clamp(1rem, 3vw, 2.5rem) 3.5rem"
          : "3.5rem clamp(1rem, 3vw, 2.5rem)",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {isFunnel ? (
        <div style={{ maxWidth: "40rem", margin: "0 auto 1.25rem" }}>
          <a
            href={brandHref}
            style={{
              display: "inline-block",
              marginBottom: "1rem",
              color: "#60A5FA",
              textDecoration: "none",
              fontSize: "0.85rem",
              fontWeight: 600,
              letterSpacing: "0.04em",
            }}
          >
            DigitalGate
          </a>
        </div>
      ) : null}
      <div
        style={{
          maxWidth: step === "preview" || step === "done" ? "40rem" : "34rem",
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
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#60A5FA",
              }}
            >
              Free Business Audit
            </p>
            <h3
              style={{
                margin: "0 0 0.55rem",
                fontSize: "1.55rem",
                lineHeight: 1.25,
                color: "#fff",
              }}
            >
              See how your business is performing online.
            </h3>
            <p
              style={{
                margin: "0 0 1.1rem",
                color: "#94a3b8",
                fontSize: "0.95rem",
                lineHeight: 1.55,
              }}
            >
              Get a free DigitalGate Business Audit™ and see how your website,
              search presence, AI visibility and digital foundations are
              performing — with clear opportunities to improve visibility, trust
              and lead generation.
            </p>
            <p
              style={{
                margin: "0 0 1.25rem",
                fontSize: "0.78rem",
                color: "#64748b",
                letterSpacing: "0.01em",
              }}
            >
              Website Health · Search Visibility · AI Visibility · Reputation ·
              Conversion Readiness
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
                placeholder="e.g. yourbusiness.com.au"
                onChange={(e) => setWebsiteUrl(e.target.value)}
                style={fieldStyle}
              />
              <button type="submit" disabled={busy} style={btnStyle}>
                {busy
                  ? "Scanning your business…"
                  : "Get My Free Business Audit →"}
              </button>
              <p
                style={{
                  margin: "0.85rem 0 0",
                  textAlign: "center",
                  fontSize: "0.8rem",
                  color: "#64748b",
                }}
              >
                No credit card required. Takes less than 60 seconds.
              </p>
            </form>
          </>
        ) : null}

        {step === "preview" ? (
          <>
            <p
              style={{
                margin: "0 0 0.35rem",
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#60A5FA",
              }}
            >
              DigitalGate Business Health Score™
            </p>
            <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
              <p
                style={{
                  margin: 0,
                  fontSize: "3rem",
                  fontWeight: 700,
                  lineHeight: 1,
                  color: scoreColor(overallScore ?? 0),
                }}
              >
                {overallScore ?? "—"}
                <span style={{ fontSize: "1.1rem", color: "#94a3b8" }}>
                  {" "}
                  / 100
                </span>
              </p>
              <p
                style={{
                  margin: "0.65rem 0 0",
                  fontSize: "0.85rem",
                  color: "#94a3b8",
                }}
              >
                {normalisedUrl}
                <button
                  type="button"
                  onClick={() => {
                    setStep("website");
                    setStatus(null);
                  }}
                  style={{
                    marginLeft: "0.65rem",
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
            </div>

            {pillars ? (
              <div
                style={{
                  display: "grid",
                  gap: "0.55rem",
                  marginBottom: "1.35rem",
                }}
              >
                {PILLAR_LABELS.map(({ key, label }) => {
                  const value = pillars[key];
                  return (
                    <div
                      key={key}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.55rem 0.7rem",
                        borderRadius: "0.5rem",
                        background: "rgba(15, 23, 42, 0.75)",
                        border: "1px solid rgba(51, 65, 85, 0.8)",
                      }}
                    >
                      <span style={{ fontSize: "0.9rem", color: "#cbd5e1" }}>
                        {label}
                      </span>
                      <span
                        style={{
                          fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                          color: scoreColor(value),
                        }}
                      >
                        {value}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : null}

            <h4
              style={{
                margin: "0 0 0.65rem",
                fontSize: "1.05rem",
                color: "#fff",
              }}
            >
              Here&apos;s what we&apos;d fix first
            </h4>
            <ol
              style={{
                margin: "0 0 1.35rem",
                paddingLeft: "1.15rem",
                color: "#cbd5e1",
                fontSize: "0.9rem",
                lineHeight: 1.5,
              }}
            >
              {(opportunities.length
                ? opportunities
                : [
                    {
                      title: "Deepen your digital foundations",
                      detail:
                        "We'll expand this diagnosis once we have your contact details.",
                      severity: "opportunity" as const,
                    },
                  ]
              ).map((opp) => (
                <li key={opp.title} style={{ marginBottom: "0.55rem" }}>
                  <strong style={{ color: "#e2e8f0" }}>{opp.title}</strong>
                  {opp.detail ? (
                    <span style={{ color: "#94a3b8" }}> — {opp.detail}</span>
                  ) : null}
                </li>
              ))}
            </ol>

            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setStatus(null);
                setStep("contact");
              }}
              style={btnStyle}
            >
              Get the full report →
            </button>
            <p
              style={{
                margin: "0.75rem 0 0",
                textAlign: "center",
                fontSize: "0.8rem",
                color: "#64748b",
              }}
            >
              We&apos;ll email your DigitalGate Business Audit™ with the full
              breakdown.
            </p>
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
              Get your full DigitalGate Business Audit™
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
              {overallScore != null ? (
                <>
                  Score {overallScore}/100
                  {normalisedUrl ? ` · ${normalisedUrl}` : ""}
                </>
              ) : (
                normalisedUrl
              )}
              <button
                type="button"
                onClick={() => {
                  setStep("preview");
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
                Back
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
                required
                value={email}
                disabled={busy}
                onChange={(e) => setEmail(e.target.value)}
                style={fieldStyle}
              />
              <label htmlFor="dgBaBiz" style={labelStyle}>
                Business
              </label>
              <input
                id="dgBaBiz"
                type="text"
                required
                value={businessName}
                disabled={busy}
                onChange={(e) => setBusinessName(e.target.value)}
                style={fieldStyle}
              />
              <label htmlFor="dgBaPhone" style={labelStyle}>
                Phone{" "}
                <span style={{ fontWeight: 400, color: "#64748b" }}>
                  (optional)
                </span>
              </label>
              <input
                id="dgBaPhone"
                type="tel"
                value={phone}
                disabled={busy}
                onChange={(e) => setPhone(e.target.value)}
                style={fieldStyle}
              />
              <label htmlFor="dgBaIndustry" style={labelStyle}>
                Industry
              </label>
              <select
                id="dgBaIndustry"
                value={industry}
                disabled={busy}
                onChange={(e) => setIndustry(e.target.value)}
                style={{ ...fieldStyle, marginBottom: "1rem" }}
              >
                <option value="">Select industry</option>
                {INDUSTRIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <label htmlFor="dgBaWebsiteLocked" style={labelStyle}>
                Website
              </label>
              <input
                id="dgBaWebsiteLocked"
                type="text"
                readOnly
                value={normalisedUrl || websiteUrl}
                style={{ ...fieldStyle, opacity: 0.85, marginBottom: "1rem" }}
              />
              <button type="submit" disabled={busy} style={btnStyle}>
                {busy ? "Sending your report…" : "Email My Full Report →"}
              </button>
            </form>
          </>
        ) : null}

        {step === "done" ? (
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                margin: "0 0 0.35rem",
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#60A5FA",
              }}
            >
              DigitalGate Business Health Score™
            </p>
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
                  fontSize: "2.5rem",
                  fontWeight: 700,
                  color: scoreColor(overallScore),
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
            {opportunities.length ? (
              <p
                style={{
                  margin: "0 0 1.25rem",
                  color: "#94a3b8",
                  fontSize: "0.95rem",
                  lineHeight: 1.5,
                }}
              >
                Your business has {opportunities.length} significant
                opportunities. Would you like DigitalGate to show you how
                we&apos;d address them?
              </p>
            ) : null}
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
              Show me how you&apos;d fix this →
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
      {isFunnel ? (
        <p
          style={{
            margin: "1.5rem auto 0",
            maxWidth: "34rem",
            textAlign: "center",
            fontSize: "0.8rem",
            color: "#64748b",
          }}
        >
          DigitalGate Business Audit™ — a DigitalGate acquisition product.
        </p>
      ) : null}
    </section>
  );
}
