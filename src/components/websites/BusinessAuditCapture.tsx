"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";

type Props = {
  siteSlug: string;
  basePath?: string;
  variant?: "funnel" | "embedded";
  logoUrl?: string | null;
};

const DEFAULT_LOGO =
  "https://app.digitalgate.com.au/brand/logo-on-dark.png";

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
  category?: string;
  observed?: string;
  interpretation?: string;
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

const SCAN_STAGES = [
  "Checking website foundations…",
  "Reading search & indexing signals…",
  "Checking structured data & entity signals…",
  "Reviewing reputation & conversion…",
];

function scoreColor(n: number) {
  if (n >= 75) return "#34d399";
  if (n >= 55) return "#60A5FA";
  if (n >= 40) return "#fbbf24";
  return "#f87171";
}

const FUNNEL_CSS = `
@import url("https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@500;600;700&family=Sora:wght@600;700;800&display=swap");
@keyframes dgBaIn {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes dgBaScan {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
@keyframes dgBaRing {
  from { stroke-dashoffset: 289; }
  to { stroke-dashoffset: var(--score-offset); }
}
@media (prefers-reduced-motion: reduce) {
  .dg-ba-funnel * { animation: none !important; transition: none !important; }
}
.dg-ba-funnel {
  --dg-blue: #3B82F6;
  --dg-ink: #e8eef8;
  position: relative;
  width: 100%;
  min-height: 100dvh;
  overflow: clip;
  color: var(--dg-ink);
  font-family: "Instrument Sans", system-ui, sans-serif;
  background: #070b14;
}
.dg-ba-funnel__glow {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 70% 55% at 12% 18%, rgba(59,130,246,0.28), transparent 60%),
    radial-gradient(ellipse 55% 45% at 88% 78%, rgba(16,185,129,0.14), transparent 55%),
    radial-gradient(ellipse 40% 30% at 70% 10%, rgba(96,165,250,0.12), transparent 50%),
    #070b14;
}
.dg-ba-funnel__grid {
  position: absolute;
  inset: 0;
  opacity: 0.22;
  background-image:
    linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 70% 65% at 50% 40%, #000 20%, transparent 75%);
}
.dg-ba-funnel__shell {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 1160px;
  min-height: 100dvh;
  margin: 0 auto;
  padding: clamp(1.5rem, 4vw, 3rem);
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: clamp(1.5rem, 4vw, 3.25rem);
  align-items: center;
  box-sizing: border-box;
}
.dg-ba-funnel__brand {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  color: #93c5fd;
  text-decoration: none;
  font-size: 0.84rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.dg-ba-funnel__brand-logo {
  height: clamp(2rem, 4.5vw, 2.75rem);
  width: auto;
  max-width: min(240px, 72vw);
  display: block;
  object-fit: contain;
  object-position: left center;
}
.dg-ba-funnel__mark {
  width: 1.55rem;
  height: 1.55rem;
  border-radius: 0.4rem;
  background: linear-gradient(145deg, #60A5FA, #2563EB);
  box-shadow: 0 0 0 1px rgba(147,197,253,0.35);
}
.dg-ba-funnel__copy { animation: dgBaIn 0.55s ease both; }
.dg-ba-funnel__eyebrow {
  margin: 1.35rem 0 0.85rem;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #60A5FA;
}
.dg-ba-funnel h1 {
  margin: 0 0 1rem;
  font-family: Sora, system-ui, sans-serif;
  font-size: clamp(2rem, 4.6vw, 3.1rem);
  line-height: 1.12;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: #fff;
  text-wrap: balance;
}
.dg-ba-funnel__lede {
  margin: 0 0 1.5rem;
  max-width: 34rem;
  font-size: clamp(1.02rem, 1.5vw, 1.12rem);
  line-height: 1.55;
  color: #9fb0c7;
}
.dg-ba-funnel__pillars {
  display: grid;
  gap: 0.55rem;
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: pillar;
}
.dg-ba-funnel__pillars li {
  counter-increment: pillar;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #d5deea;
  font-size: 0.92rem;
  font-weight: 600;
}
.dg-ba-funnel__pillars li::before {
  content: counter(pillar, decimal-leading-zero);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #60A5FA;
  width: 1.6rem;
}
.dg-ba-funnel__panel {
  animation: dgBaIn 0.65s ease 0.08s both;
  background: rgba(10, 16, 28, 0.82);
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 1.25rem;
  padding: clamp(1.35rem, 3vw, 1.85rem);
  box-shadow: 0 28px 60px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(16px);
}
.dg-ba-funnel__steps {
  display: flex;
  gap: 0.45rem;
  margin: 0 0 1.25rem;
}
.dg-ba-funnel__step {
  flex: 1;
  height: 3px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.1);
}
.dg-ba-funnel__step.is-on { background: #3B82F6; }
.dg-ba-funnel__panel h2 {
  margin: 0 0 0.4rem;
  font-family: Sora, system-ui, sans-serif;
  font-size: clamp(1.35rem, 2.4vw, 1.6rem);
  color: #fff;
  font-weight: 700;
}
.dg-ba-funnel__sub {
  margin: 0 0 1.2rem;
  color: #94a3b8;
  font-size: 0.95rem;
  line-height: 1.5;
}
.dg-ba-funnel label {
  display: block;
  margin: 0 0 0.35rem;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #94a3b8;
}
.dg-ba-funnel input,
.dg-ba-funnel select {
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 0.9rem;
  padding: 0.9rem 1rem;
  border-radius: 0.65rem;
  border: 1px solid #334155;
  background: #0b1220;
  color: #e2e8f0;
  font: inherit;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.dg-ba-funnel input:focus,
.dg-ba-funnel select:focus {
  border-color: #60A5FA;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
}
.dg-ba-funnel button[type="submit"],
.dg-ba-funnel button.dg-ba-primary,
.dg-ba-funnel a.dg-ba-primary {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0.95rem 1.1rem;
  border: none;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, #60A5FA, #3B82F6 55%, #2563EB);
  color: #fff;
  font: inherit;
  font-size: 0.98rem;
  font-weight: 700;
  cursor: pointer;
  text-decoration: none;
  transition: transform 0.18s ease, filter 0.18s ease;
}
.dg-ba-funnel button[type="submit"]:hover,
.dg-ba-funnel button.dg-ba-primary:hover,
.dg-ba-funnel a.dg-ba-primary:hover {
  transform: translateY(-1px);
  filter: brightness(1.06);
}
.dg-ba-funnel button:disabled { cursor: wait; opacity: 0.85; }
.dg-ba-funnel__note {
  margin: 0.85rem 0 0;
  text-align: center;
  font-size: 0.8rem;
  color: #64748b;
}
.dg-ba-funnel__status {
  margin: 0.9rem 0 0;
  font-size: 0.9rem;
  min-height: 1.25rem;
  color: #94a3b8;
}
.dg-ba-funnel__status.is-error { color: #fca5a5; }
.dg-ba-funnel__status.is-ok { color: #86efac; }
.dg-ba-funnel__scan {
  margin: 0.85rem 0 0;
  height: 3px;
  border-radius: 99px;
  background: linear-gradient(90deg, transparent, #60A5FA, transparent);
  background-size: 200% 100%;
  animation: dgBaScan 1.1s linear infinite;
}
.dg-ba-funnel__score {
  display: grid;
  place-items: center;
  margin: 0.25rem 0 1.15rem;
}
.dg-ba-funnel__score-ring {
  position: relative;
  width: 8.5rem;
  height: 8.5rem;
}
.dg-ba-funnel__score-ring svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}
.dg-ba-funnel__score-ring circle.track {
  fill: none;
  stroke: rgba(148,163,184,0.18);
  stroke-width: 8;
}
.dg-ba-funnel__score-ring circle.value {
  fill: none;
  stroke-width: 8;
  stroke-linecap: round;
  stroke-dasharray: 289;
  animation: dgBaRing 0.9s ease forwards;
}
.dg-ba-funnel__score-num {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-family: Sora, system-ui, sans-serif;
  font-size: 2.1rem;
  font-weight: 800;
  color: #fff;
}
.dg-ba-funnel__score-num span {
  font-size: 0.85rem;
  font-weight: 600;
  color: #94a3b8;
}
.dg-ba-funnel__bars {
  display: grid;
  gap: 0.65rem;
  margin: 0 0 1.25rem;
}
.dg-ba-funnel__bar {
  display: grid;
  gap: 0.3rem;
}
.dg-ba-funnel__bar-top {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.88rem;
  color: #cbd5e1;
}
.dg-ba-funnel__bar-track {
  height: 7px;
  border-radius: 99px;
  background: rgba(51, 65, 85, 0.85);
  overflow: hidden;
}
.dg-ba-funnel__bar-fill {
  height: 100%;
  border-radius: 99px;
  width: var(--w);
  transition: width 0.7s ease;
}
.dg-ba-funnel__opps {
  margin: 0 0 1.2rem;
  padding-left: 1.15rem;
  color: #cbd5e1;
  font-size: 0.9rem;
  line-height: 1.5;
}
.dg-ba-funnel__opps li { margin-bottom: 0.45rem; }
.dg-ba-funnel__meta {
  margin: 0 0 1rem;
  padding: 0.7rem 0.85rem;
  border-radius: 0.65rem;
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.25);
  color: #bfdbfe;
  font-size: 0.9rem;
}
.dg-ba-funnel__meta button {
  margin-left: 0.55rem;
  border: none;
  background: transparent;
  color: #93c5fd;
  text-decoration: underline;
  cursor: pointer;
  font: inherit;
  font-size: 0.8rem;
}
.dg-ba-funnel__done { text-align: center; }
.dg-ba-funnel__done h2 { margin-bottom: 0.65rem; }
.dg-ba-funnel__done p { margin: 0 0 1.15rem; color: #94a3b8; line-height: 1.55; }
.dg-ba-funnel__foot {
  grid-column: 1 / -1;
  margin: 0;
  text-align: center;
  font-size: 0.78rem;
  color: #64748b;
}
@media (max-width: 860px) {
  .dg-ba-funnel__shell {
    grid-template-columns: 1fr;
    align-content: center;
    gap: 1.5rem;
  }
}
`;

export function BusinessAuditCapture({
  siteSlug,
  basePath = "",
  variant = "embedded",
  logoUrl,
}: Props) {
  const isFunnel = variant === "funnel";
  const brandLogo = (logoUrl || "").trim() || DEFAULT_LOGO;
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
  const [scanStage, setScanStage] = useState(0);
  const [status, setStatus] = useState<{
    type: "error" | "ok" | "loading";
    text: string;
  } | null>(null);
  const [doneMessage, setDoneMessage] = useState("");
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [pillars, setPillars] = useState<Pillars | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const urlRef = useRef<HTMLInputElement>(null);
  const styleId = useId();

  const strategyHref =
    basePath && basePath !== "/"
      ? `${basePath}/strategy-session`
      : "https://digitalgate.com.au/strategy-session";
  const brandHref = "https://digitalgate.com.au";

  useEffect(() => {
    if (isFunnel && step === "website") urlRef.current?.focus();
  }, [isFunnel, step]);

  useEffect(() => {
    if (!busy || status?.type !== "loading") return;
    const id = window.setInterval(() => {
      setScanStage((s) => (s + 1) % SCAN_STAGES.length);
    }, 900);
    return () => window.clearInterval(id);
  }, [busy, status?.type]);

  async function onWebsiteSubmit(e: FormEvent) {
    e.preventDefault();
    const raw = websiteUrl.trim();
    if (!raw) {
      setStatus({ type: "error", text: "Enter your website URL." });
      return;
    }
    setBusy(true);
    setScanStage(0);
    setStatus({
      type: "loading",
      text: SCAN_STAGES[0],
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
    borderRadius: "0.75rem",
    border: "none",
    background: "#3B82F6",
    color: "#fff",
    fontWeight: 600,
    fontSize: "0.95rem",
    cursor: busy ? "wait" : "pointer",
  };

  if (!isFunnel) {
    return (
      <section
        id="business-audit-form"
        className="dg-business-audit-capture"
        style={{
          background: "#0A0E17",
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
              <h3 style={{ margin: "0 0 0.55rem", fontSize: "1.55rem", color: "#fff" }}>
                See how your business is performing online.
              </h3>
              <p style={{ margin: "0 0 1.1rem", color: "#94a3b8", fontSize: "0.95rem", lineHeight: 1.55 }}>
                Get a free DigitalGate Business Audit™ across website, search, AI
                visibility and conversion readiness.
              </p>
              <form onSubmit={(e) => void onWebsiteSubmit(e)}>
                <label htmlFor="dgBaUrlEmbedded" style={labelStyle}>
                  Website URL
                </label>
                <input
                  id="dgBaUrlEmbedded"
                  type="text"
                  required
                  value={websiteUrl}
                  disabled={busy}
                  placeholder="https://yourbusiness.com.au"
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  style={fieldStyle}
                />
                <button type="submit" disabled={busy} style={btnStyle}>
                  {busy ? "Scanning…" : "Get My Free Business Audit →"}
                </button>
              </form>
            </>
          ) : null}
          {step === "preview" && pillars ? (
            <>
              <p style={{ margin: "0 0 0.75rem", color: "#60A5FA", fontWeight: 700 }}>
                Score {overallScore ?? "—"}/100
              </p>
              {PILLAR_LABELS.map(({ key, label }) => (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "0.45rem",
                    color: "#cbd5e1",
                  }}
                >
                  <span>{label}</span>
                  <strong style={{ color: scoreColor(pillars[key]) }}>
                    {pillars[key]}
                  </strong>
                </div>
              ))}
              <button
                type="button"
                className="dg-ba-primary"
                style={{ ...btnStyle, marginTop: "1rem" }}
                onClick={() => setStep("contact")}
              >
                Get the full report →
              </button>
            </>
          ) : null}
          {step === "contact" ? (
            <form onSubmit={(e) => void onContactSubmit(e)}>
              <label htmlFor="dgBaNameE" style={labelStyle}>
                Full name
              </label>
              <input
                id="dgBaNameE"
                required
                value={fullName}
                disabled={busy}
                onChange={(e) => setFullName(e.target.value)}
                style={fieldStyle}
              />
              <label htmlFor="dgBaEmailE" style={labelStyle}>
                Email
              </label>
              <input
                id="dgBaEmailE"
                type="email"
                required
                value={email}
                disabled={busy}
                onChange={(e) => setEmail(e.target.value)}
                style={fieldStyle}
              />
              <label htmlFor="dgBaBizE" style={labelStyle}>
                Business
              </label>
              <input
                id="dgBaBizE"
                required
                value={businessName}
                disabled={busy}
                onChange={(e) => setBusinessName(e.target.value)}
                style={fieldStyle}
              />
              <button type="submit" disabled={busy} style={btnStyle}>
                Email My Full Report →
              </button>
            </form>
          ) : null}
          {step === "done" ? (
            <div style={{ textAlign: "center" }}>
              <h3 style={{ color: "#fff" }}>You&apos;re all set</h3>
              <p style={{ color: "#94a3b8" }}>{doneMessage}</p>
              <a href={strategyHref} style={{ ...btnStyle, display: "inline-flex", textDecoration: "none" }}>
                Show me how you&apos;d fix this →
              </a>
            </div>
          ) : null}
          {status ? (
            <p role="status" style={{ marginTop: "1rem", color: "#94a3b8" }}>
              {status.text}
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  const stepIndex =
    step === "website" ? 0 : step === "preview" ? 1 : step === "contact" ? 2 : 3;
  const score = overallScore ?? 0;
  const scoreOffset = 289 - (289 * Math.max(0, Math.min(100, score))) / 100;
  const loadingText =
    status?.type === "loading" && step === "website"
      ? SCAN_STAGES[scanStage]
      : status?.text;

  return (
    <>
      <style id={styleId} dangerouslySetInnerHTML={{ __html: FUNNEL_CSS }} />
      <section
        id="business-audit-form"
        className="dg-business-audit-capture dg-business-audit-funnel dg-ba-funnel"
      >
        <div className="dg-ba-funnel__glow" aria-hidden />
        <div className="dg-ba-funnel__grid" aria-hidden />
        <div className="dg-ba-funnel__shell">
          <div className="dg-ba-funnel__copy">
            <a className="dg-ba-funnel__brand" href={brandHref} aria-label="DigitalGate">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={brandLogo}
                alt="DigitalGate"
                className="dg-ba-funnel__brand-logo"
              />
            </a>
            <p className="dg-ba-funnel__eyebrow">Free Business Audit</p>
            <h1>See how your business performs across the digital world</h1>
            <p className="dg-ba-funnel__lede">
              Get an instant snapshot of your website, search presence, AI
              visibility and digital foundations — then discover where you may
              be losing visibility, enquiries and opportunities.
            </p>
            <ol className="dg-ba-funnel__pillars">
              {PILLAR_LABELS.map(({ label }) => (
                <li key={label}>{label}</li>
              ))}
            </ol>
          </div>

          <div className="dg-ba-funnel__panel">
            <div className="dg-ba-funnel__steps" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`dg-ba-funnel__step${i <= stepIndex ? " is-on" : ""}`}
                />
              ))}
            </div>

            {step === "website" ? (
              <>
                <h2>Enter your website to start</h2>
                <p className="dg-ba-funnel__sub">
                  We&apos;ll scan your digital presence and show your DigitalGate
                  Business Health Score™.
                </p>
                <form onSubmit={(e) => void onWebsiteSubmit(e)}>
                  <label htmlFor="dgBaUrl">Website URL</label>
                  <input
                    ref={urlRef}
                    id="dgBaUrl"
                    type="text"
                    required
                    autoComplete="url"
                    value={websiteUrl}
                    disabled={busy}
                    placeholder="https://yourbusiness.com.au"
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                  />
                  <button type="submit" disabled={busy}>
                    {busy ? "Scanning…" : "Get My Free Business Audit →"}
                  </button>
                  <p className="dg-ba-funnel__note">
                    No credit card required. Takes less than 60 seconds.
                  </p>
                </form>
                {busy ? <div className="dg-ba-funnel__scan" aria-hidden /> : null}
              </>
            ) : null}

            {step === "preview" ? (
              <>
                <p
                  style={{
                    margin: "0 0 0.35rem",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#60A5FA",
                    textAlign: "center",
                  }}
                >
                  DigitalGate Business Health Score™
                </p>
                <div className="dg-ba-funnel__score">
                  <div
                    className="dg-ba-funnel__score-ring"
                    style={
                      {
                        ["--score-offset" as string]: String(scoreOffset),
                      } as CSSProperties
                    }
                  >
                    <svg viewBox="0 0 100 100" aria-hidden>
                      <circle className="track" cx="50" cy="50" r="46" />
                      <circle
                        className="value"
                        cx="50"
                        cy="50"
                        r="46"
                        style={{ stroke: scoreColor(score) }}
                      />
                    </svg>
                    <div className="dg-ba-funnel__score-num">
                      {overallScore ?? "—"}
                      <span>/100</span>
                    </div>
                  </div>
                </div>
                {normalisedUrl ? (
                  <p className="dg-ba-funnel__meta">
                    {normalisedUrl}
                    <button
                      type="button"
                      onClick={() => {
                        setStep("website");
                        setStatus(null);
                      }}
                    >
                      Change
                    </button>
                  </p>
                ) : null}
                {pillars ? (
                  <div className="dg-ba-funnel__bars">
                    {PILLAR_LABELS.map(({ key, label }) => (
                      <div key={key} className="dg-ba-funnel__bar">
                        <div className="dg-ba-funnel__bar-top">
                          <span>{label}</span>
                          <strong style={{ color: scoreColor(pillars[key]) }}>
                            {pillars[key]}
                          </strong>
                        </div>
                        <div className="dg-ba-funnel__bar-track">
                          <div
                            className="dg-ba-funnel__bar-fill"
                            style={
                              {
                                ["--w" as string]: `${pillars[key]}%`,
                                background: scoreColor(pillars[key]),
                              } as CSSProperties
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                <h3
                  style={{
                    margin: "0 0 0.55rem",
                    fontSize: "1.05rem",
                    color: "#fff",
                    fontFamily: "Sora, system-ui, sans-serif",
                  }}
                >
                  The opportunities we&apos;d prioritise
                </h3>
                <ol className="dg-ba-funnel__opps">
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
                    <li key={opp.title}>
                      <strong style={{ color: "#e2e8f0" }}>{opp.title}</strong>
                      {opp.interpretation || opp.detail ? (
                        <span style={{ color: "#94a3b8" }}>
                          {" "}
                          — {opp.interpretation || opp.detail}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ol>
                <button
                  type="button"
                  className="dg-ba-primary"
                  disabled={busy}
                  onClick={() => {
                    setStatus(null);
                    setStep("contact");
                  }}
                >
                  Get the full report →
                </button>
              </>
            ) : null}

            {step === "contact" ? (
              <>
                <h2>Get your full DigitalGate Business Audit™</h2>
                <p className="dg-ba-funnel__sub">
                  We&apos;ll email the full breakdown and keep your DigitalGate
                  Business Health Score™ on file.
                </p>
                {overallScore != null || normalisedUrl ? (
                  <p className="dg-ba-funnel__meta">
                    {overallScore != null ? `Score ${overallScore}/100` : null}
                    {normalisedUrl
                      ? `${overallScore != null ? " · " : ""}${normalisedUrl}`
                      : null}
                    <button
                      type="button"
                      onClick={() => {
                        setStep("preview");
                        setStatus(null);
                      }}
                    >
                      Back
                    </button>
                  </p>
                ) : null}
                <form onSubmit={(e) => void onContactSubmit(e)}>
                  <div aria-hidden style={{ position: "absolute", left: "-9999px" }}>
                    <input
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                    />
                  </div>
                  <label htmlFor="dgBaName">Full name</label>
                  <input
                    id="dgBaName"
                    required
                    value={fullName}
                    disabled={busy}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                  <label htmlFor="dgBaEmail">Email</label>
                  <input
                    id="dgBaEmail"
                    type="email"
                    required
                    value={email}
                    disabled={busy}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <label htmlFor="dgBaBiz">Business</label>
                  <input
                    id="dgBaBiz"
                    required
                    value={businessName}
                    disabled={busy}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                  <label htmlFor="dgBaPhone">Phone (optional)</label>
                  <input
                    id="dgBaPhone"
                    type="tel"
                    value={phone}
                    disabled={busy}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <label htmlFor="dgBaInd">Industry</label>
                  <select
                    id="dgBaInd"
                    value={industry}
                    disabled={busy}
                    onChange={(e) => setIndustry(e.target.value)}
                  >
                    <option value="">Select industry</option>
                    {INDUSTRIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <button type="submit" disabled={busy}>
                    {busy ? "Sending…" : "Email My Full Report →"}
                  </button>
                </form>
              </>
            ) : null}

            {step === "done" ? (
              <div className="dg-ba-funnel__done">
                <p
                  style={{
                    margin: "0 0 0.45rem",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#60A5FA",
                  }}
                >
                  DigitalGate Business Health Score™
                </p>
                {overallScore != null ? (
                  <p
                    style={{
                      margin: "0 0 0.65rem",
                      fontSize: "2.4rem",
                      fontWeight: 800,
                      fontFamily: "Sora, system-ui, sans-serif",
                      color: scoreColor(overallScore),
                    }}
                  >
                    {overallScore}
                    <span style={{ fontSize: "1rem", color: "#94a3b8" }}>/100</span>
                  </p>
                ) : null}
                <h2>You&apos;re all set</h2>
                <p>{doneMessage}</p>
                {opportunities.length ? (
                  <p style={{ marginTop: "-0.35rem" }}>
                    Your business has {opportunities.length} significant
                    opportunities. Want DigitalGate to show you how we&apos;d
                    address them?
                  </p>
                ) : null}
                <a className="dg-ba-primary" href={strategyHref}>
                  Show me how you&apos;d fix this →
                </a>
              </div>
            ) : null}

            {status || busy ? (
              <p
                role="status"
                aria-live="polite"
                className={`dg-ba-funnel__status${status ? ` is-${status.type}` : ""}`}
              >
                {loadingText || status?.text}
              </p>
            ) : (
              <p className="dg-ba-funnel__status" aria-hidden>
                {" "}
              </p>
            )}
          </div>

          <p className="dg-ba-funnel__foot">
            DigitalGate Business Audit™ — a DigitalGate acquisition product.
          </p>
        </div>
      </section>
    </>
  );
}
