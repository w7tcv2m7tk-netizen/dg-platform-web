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
};

type Step = "address" | "contact" | "done";

const PROPERTY_TYPES = [
  "House",
  "Apartment",
  "Townhouse",
  "Unit",
  "Land",
  "Acreage",
  "Other",
];

const TIMEFRAMES = [
  "Ready now",
  "1–3 months",
  "3–6 months",
  "6–12 months",
  "Just researching",
];

const HERO_IMAGE =
  "https://roerealty.com.au/wp-content/uploads/2026/05/IMG_9317-scaled.jpeg";

const FUNNEL_CSS = `
@import url("https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,560;9..144,700&family=Manrope:wght@500;600;700;800&display=swap");
@keyframes dgRrIn {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes dgRrPulse {
  0%, 100% { opacity: .55; }
  50% { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .dg-rr-funnel * { animation: none !important; transition: none !important; }
}
.dg-rr-funnel {
  --rr-ink: #f7f4ef;
  --rr-gold: #C9A46C;
  --rr-deep: #1C2B2A;
  --rr-panel: rgba(15, 26, 24, 0.78);
  position: relative;
  width: 100%;
  min-height: 100dvh;
  display: flex;
  align-items: stretch;
  overflow: clip;
  color: var(--rr-ink);
  font-family: Manrope, system-ui, sans-serif;
  background: #0b1413;
}
.dg-rr-funnel__bg {
  position: absolute;
  inset: 0;
  background-image: var(--rr-hero);
  background-size: cover;
  background-position: center 40%;
  transform: scale(1.04);
}
.dg-rr-funnel__veil {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(105deg, rgba(12, 22, 21, 0.92) 0%, rgba(12, 22, 21, 0.72) 42%, rgba(12, 22, 21, 0.38) 100%),
    linear-gradient(0deg, rgba(8, 14, 13, 0.55) 0%, transparent 38%);
}
.dg-rr-funnel__shell {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: clamp(1.5rem, 4vw, 3rem);
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: clamp(1.5rem, 4vw, 3.5rem);
  align-items: center;
  min-height: 100dvh;
  box-sizing: border-box;
}
.dg-rr-funnel__brand {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  color: var(--rr-gold);
  text-decoration: none;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.dg-rr-funnel__brand-mark {
  width: 1.55rem;
  height: 1.55rem;
  border-radius: 0.35rem;
  background: linear-gradient(145deg, #C9A46C, #8a6a3a);
  color: #1C2B2A;
  display: inline-grid;
  place-items: center;
  font-weight: 800;
  font-size: 0.75rem;
}
.dg-rr-funnel__copy { animation: dgRrIn 0.55s ease both; }
.dg-rr-funnel__eyebrow {
  margin: 1.35rem 0 0.85rem;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--rr-gold);
}
.dg-rr-funnel h1 {
  margin: 0 0 1rem;
  font-family: Fraunces, Georgia, serif;
  font-size: clamp(2.15rem, 4.8vw, 3.35rem);
  line-height: 1.12;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #fff;
  text-wrap: balance;
}
.dg-rr-funnel__lede {
  margin: 0 0 1.5rem;
  max-width: 34rem;
  font-size: clamp(1.02rem, 1.6vw, 1.18rem);
  line-height: 1.55;
  color: rgba(247, 244, 239, 0.88);
}
.dg-rr-funnel__trust {
  display: grid;
  gap: 0.65rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.dg-rr-funnel__trust li {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  color: rgba(247, 244, 239, 0.92);
  font-size: 0.95rem;
  font-weight: 600;
}
.dg-rr-funnel__trust i {
  width: 1.45rem;
  height: 1.45rem;
  border-radius: 999px;
  display: inline-grid;
  place-items: center;
  background: rgba(201, 164, 108, 0.18);
  color: var(--rr-gold);
  font-style: normal;
  font-size: 0.75rem;
  font-weight: 800;
}
.dg-rr-funnel__panel {
  animation: dgRrIn 0.65s ease 0.08s both;
  background: var(--rr-panel);
  border: 1px solid rgba(201, 164, 108, 0.28);
  border-radius: 1.25rem;
  padding: clamp(1.35rem, 3vw, 1.85rem);
  box-shadow: 0 28px 60px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(14px);
}
.dg-rr-funnel__steps {
  display: flex;
  gap: 0.45rem;
  margin: 0 0 1.25rem;
}
.dg-rr-funnel__step {
  flex: 1;
  height: 3px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.12);
}
.dg-rr-funnel__step.is-on { background: var(--rr-gold); }
.dg-rr-funnel__badge {
  display: inline-block;
  margin-bottom: 0.85rem;
  padding: 0.35rem 0.8rem;
  border-radius: 0.4rem;
  border: 1px solid rgba(201, 164, 108, 0.35);
  background: rgba(201, 164, 108, 0.12);
  color: #f3e6cc;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.dg-rr-funnel__panel h2 {
  margin: 0 0 0.4rem;
  font-family: Fraunces, Georgia, serif;
  font-size: clamp(1.45rem, 2.5vw, 1.75rem);
  color: #fff;
  font-weight: 700;
}
.dg-rr-funnel__sub {
  margin: 0 0 1.25rem;
  color: rgba(247, 244, 239, 0.72);
  font-size: 0.95rem;
}
.dg-rr-funnel label {
  display: block;
  margin: 0 0 0.4rem;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(247, 244, 239, 0.78);
}
.dg-rr-funnel input,
.dg-rr-funnel select {
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 0.95rem;
  padding: 0.95rem 1rem;
  border-radius: 0.7rem;
  border: 1.5px solid rgba(201, 164, 108, 0.55);
  background: rgba(12, 22, 21, 0.85);
  color: #fff;
  font: inherit;
  font-size: 1rem;
  font-weight: 600;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.dg-rr-funnel input:focus,
.dg-rr-funnel select:focus {
  border-color: #fff;
  box-shadow: 0 0 0 3px rgba(201, 164, 108, 0.28);
}
.dg-rr-funnel input::placeholder { color: rgba(247,244,239,0.45); font-weight: 500; }
.dg-rr-funnel button[type="submit"],
.dg-rr-funnel .dg-rr-cta {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem 1.15rem;
  border: none;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, #d4b57a, #C9A46C 50%, #a07d45);
  color: #1C2B2A;
  font: inherit;
  font-size: 1rem;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.18s ease, filter 0.18s ease;
}
.dg-rr-funnel button[type="submit"]:hover,
.dg-rr-funnel .dg-rr-cta:hover { transform: translateY(-1px); filter: brightness(1.05); }
.dg-rr-funnel button[type="submit"]:disabled { cursor: wait; opacity: 0.85; }
.dg-rr-funnel__note {
  margin: 0.85rem 0 0;
  text-align: center;
  font-size: 0.8rem;
  color: rgba(247, 244, 239, 0.62);
}
.dg-rr-funnel__status {
  margin: 0.95rem 0 0;
  font-size: 0.9rem;
  min-height: 1.25rem;
}
.dg-rr-funnel__status.is-loading { animation: dgRrPulse 1.2s ease infinite; color: #f3e6cc; }
.dg-rr-funnel__status.is-error { color: #fecaca; }
.dg-rr-funnel__addr {
  margin: 0 0 1rem;
  padding: 0.75rem 0.9rem;
  border-radius: 0.65rem;
  background: rgba(201, 164, 108, 0.1);
  border: 1px solid rgba(201, 164, 108, 0.25);
  color: #fff;
  font-size: 0.92rem;
}
.dg-rr-funnel__addr button {
  margin-left: 0.65rem;
  border: none;
  background: transparent;
  color: var(--rr-gold);
  text-decoration: underline;
  cursor: pointer;
  font: inherit;
  font-size: 0.8rem;
}
.dg-rr-funnel__done { text-align: center; }
.dg-rr-funnel__done h2 { margin-bottom: 0.75rem; }
.dg-rr-funnel__done p { margin: 0 0 1.35rem; color: rgba(247,244,239,0.8); line-height: 1.55; }
.dg-rr-funnel__done a.dg-rr-cta { text-decoration: none; }
.dg-rr-funnel__foot {
  grid-column: 1 / -1;
  margin: 0;
  text-align: center;
  font-size: 0.78rem;
  color: rgba(247, 244, 239, 0.55);
}
@media (max-width: 860px) {
  .dg-rr-funnel__shell {
    grid-template-columns: 1fr;
    align-content: center;
    gap: 1.5rem;
    padding-top: 2.25rem;
    padding-bottom: 2.25rem;
  }
  .dg-rr-funnel__trust {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem 1rem;
  }
}
`;

export function PropertyReportCapture({
  siteSlug,
  basePath = "",
  variant = "embedded",
}: Props) {
  const isFunnel = variant === "funnel";
  const [step, setStep] = useState<Step>("address");
  const [address, setAddress] = useState("");
  const [formatted, setFormatted] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{
    type: "error" | "ok" | "loading";
    text: string;
  } | null>(null);
  const [doneMessage, setDoneMessage] = useState("");
  const addressRef = useRef<HTMLInputElement>(null);
  const styleId = useId();

  const appraisalHref =
    basePath && basePath !== "/"
      ? `${basePath}/property-appraisal`
      : "https://roerealty.com.au/property-appraisal";
  const brandHref = "https://roerealty.com.au";

  useEffect(() => {
    if (isFunnel && step === "address") {
      addressRef.current?.focus();
    }
  }, [isFunnel, step]);

  async function onAddressSubmit(e: FormEvent) {
    e.preventDefault();
    const raw = address.trim();
    if (!raw) {
      setStatus({ type: "error", text: "Enter your property address." });
      return;
    }
    setBusy(true);
    setStatus({ type: "loading", text: "Finding your property…" });
    try {
      const res = await fetch("/api/public/property-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resolve",
          siteSlug,
          rawAddress: raw,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        data?: { formatted?: string };
        error?: { message?: string };
      };
      if (!res.ok) {
        setStatus({
          type: "error",
          text: json?.error?.message || "Could not look up that address.",
        });
        setBusy(false);
        return;
      }
      const next = json?.data?.formatted?.trim() || raw;
      setFormatted(next);
      setAddress(next);
      setStatus(null);
      setStep("contact");
    } catch {
      setStatus({ type: "error", text: "Network error. Please try again." });
    }
    setBusy(false);
  }

  async function onContactSubmit(e: FormEvent) {
    e.preventDefault();
    const name = fullName.trim();
    const mail = email.trim();
    const mobile = phone.trim();
    if (!name) {
      setStatus({ type: "error", text: "Please enter your full name." });
      return;
    }
    if (!mail && !mobile) {
      setStatus({
        type: "error",
        text: "Please provide either an email or mobile number.",
      });
      return;
    }
    setBusy(true);
    setStatus({
      type: "loading",
      text: "Building your Cotality property report…",
    });
    try {
      const res = await fetch("/api/public/property-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          siteSlug,
          rawAddress: formatted || address.trim(),
          fullName: name,
          email: mail,
          phone: mobile,
          propertyType,
          timeframe,
          website: honeypot,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        data?: { message?: string };
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
      setDoneMessage(
        json?.data?.message ||
          "Your property report is on its way — check your inbox shortly.",
      );
      setStatus(null);
      setStep("done");
    } catch {
      setStatus({ type: "error", text: "Network error. Please try again." });
    }
    setBusy(false);
  }

  const embeddedField: CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "0.75rem 0.85rem",
    borderRadius: "0.5rem",
    border: "1px solid #cfc8c0",
    marginBottom: "0.85rem",
    fontSize: "1rem",
    background: "#fff",
    color: "#1C2B2A",
  };
  const embeddedLabel: CSSProperties = {
    display: "block",
    fontSize: "0.8rem",
    fontWeight: 600,
    marginBottom: "0.35rem",
    color: "#1C2B2A",
  };
  const embeddedBtn: CSSProperties = {
    width: "100%",
    padding: "0.85rem 1rem",
    borderRadius: "0.5rem",
    border: "none",
    background: "#1C2B2A",
    color: "#fff",
    fontWeight: 600,
    fontSize: "0.95rem",
    cursor: busy ? "wait" : "pointer",
  };

  if (!isFunnel) {
    return (
      <section
        id="property-report-form"
        className="dg-property-report-capture"
        style={{
          background: "#F5F2EF",
          color: "#1C2B2A",
          padding: "3rem clamp(1rem, 3vw, 2.5rem)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: "32rem",
            margin: "0 auto",
            background: "#fff",
            borderRadius: "0.75rem",
            padding: "1.75rem 1.5rem",
            boxShadow: "0 8px 28px rgba(28, 43, 42, 0.08)",
            border: "1px solid rgba(28, 43, 42, 0.08)",
          }}
        >
          {step === "address" ? (
            <>
              <h3 style={{ margin: "0 0 0.35rem", fontSize: "1.35rem" }}>
                Get Your Free Property Report
              </h3>
              <p style={{ margin: "0 0 1.25rem", color: "#5a5a5a", fontSize: "0.95rem" }}>
                Value range · Buyer demand · Comparable sales
              </p>
              <form onSubmit={(e) => void onAddressSubmit(e)}>
                <label htmlFor="dgPrAddress" style={embeddedLabel}>
                  Property address
                </label>
                <input
                  id="dgPrAddress"
                  type="text"
                  required
                  value={address}
                  disabled={busy}
                  placeholder="e.g. 123 Main Street, Currumbin QLD"
                  onChange={(e) => setAddress(e.target.value)}
                  style={embeddedField}
                />
                <button type="submit" disabled={busy} style={embeddedBtn}>
                  {busy ? "Finding address…" : "Get My Free Report"}
                </button>
              </form>
            </>
          ) : null}
          {step === "contact" ? (
            <>
              <h3 style={{ margin: "0 0 0.35rem", fontSize: "1.35rem" }}>Almost there</h3>
              <p style={{ margin: "0 0 0.75rem", color: "#5a5a5a", fontSize: "0.95rem" }}>
                Where should we send your Property Value &amp; Buyer Demand Report?
              </p>
              {formatted ? (
                <p
                  style={{
                    margin: "0 0 1.25rem",
                    padding: "0.65rem 0.75rem",
                    background: "#F5F2EF",
                    borderRadius: "0.4rem",
                    fontSize: "0.9rem",
                  }}
                >
                  {formatted}
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
                <label htmlFor="dgPrName" style={embeddedLabel}>
                  Full name
                </label>
                <input
                  id="dgPrName"
                  required
                  value={fullName}
                  disabled={busy}
                  onChange={(e) => setFullName(e.target.value)}
                  style={embeddedField}
                />
                <label htmlFor="dgPrEmail" style={embeddedLabel}>
                  Email
                </label>
                <input
                  id="dgPrEmail"
                  type="email"
                  value={email}
                  disabled={busy}
                  onChange={(e) => setEmail(e.target.value)}
                  style={embeddedField}
                />
                <label htmlFor="dgPrPhone" style={embeddedLabel}>
                  Mobile
                </label>
                <input
                  id="dgPrPhone"
                  type="tel"
                  value={phone}
                  disabled={busy}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ ...embeddedField, marginBottom: "1rem" }}
                />
                <button type="submit" disabled={busy} style={embeddedBtn}>
                  {busy ? "Sending…" : "Send My Report"}
                </button>
              </form>
            </>
          ) : null}
          {step === "done" ? (
            <div style={{ textAlign: "center" }}>
              <h3 style={{ margin: "0 0 0.75rem" }}>You&apos;re all set</h3>
              <p style={{ margin: "0 0 1.25rem", lineHeight: 1.55 }}>{doneMessage}</p>
              <a
                href={appraisalHref}
                style={{
                  display: "inline-flex",
                  padding: "0.75rem 1.15rem",
                  borderRadius: "0.5rem",
                  background: "#C9A46C",
                  color: "#1C2B2A",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Book a free appraisal →
              </a>
            </div>
          ) : null}
          {status ? (
            <p
              role="status"
              style={{
                margin: "1rem 0 0",
                fontSize: "0.9rem",
                color:
                  status.type === "error"
                    ? "#9b1c1c"
                    : status.type === "ok"
                      ? "#166534"
                      : "#5a5a5a",
              }}
            >
              {status.text}
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  const stepIndex = step === "address" ? 0 : step === "contact" ? 1 : 2;

  return (
    <>
      <style id={styleId} dangerouslySetInnerHTML={{ __html: FUNNEL_CSS }} />
      <section
        id="property-report-form"
        className="dg-property-report-capture dg-property-report-funnel dg-rr-funnel"
        style={{ ["--rr-hero" as string]: `url(${HERO_IMAGE})` }}
      >
        <div className="dg-rr-funnel__bg" aria-hidden />
        <div className="dg-rr-funnel__veil" aria-hidden />
        <div className="dg-rr-funnel__shell">
          <div className="dg-rr-funnel__copy">
            <a className="dg-rr-funnel__brand" href={brandHref}>
              <span className="dg-rr-funnel__brand-mark" aria-hidden>
                R
              </span>
              Roe Realty
            </a>
            <p className="dg-rr-funnel__eyebrow">Free Instant Report</p>
            <h1>Find Out What Buyers Would Pay for Your Property Right Now</h1>
            <p className="dg-rr-funnel__lede">
              Receive a value range, recent comparable sales, and buyer demand
              insights in minutes — then decide your next move with clarity.
            </p>
            <ul className="dg-rr-funnel__trust">
              {[
                "Buyer demand analytics",
                "Instant valuation range",
                "No obligation",
              ].map((item) => (
                <li key={item}>
                  <i aria-hidden>✓</i>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="dg-rr-funnel__panel">
            <div className="dg-rr-funnel__steps" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={`dg-rr-funnel__step${i <= stepIndex ? " is-on" : ""}`}
                />
              ))}
            </div>

            {step === "address" ? (
              <>
                <div className="dg-rr-funnel__badge">⭐ Free Instant Report</div>
                <h2>Get Your Free Property Report</h2>
                <p className="dg-rr-funnel__sub">
                  Value range · Buyer demand · Comparable sales
                </p>
                <form onSubmit={(e) => void onAddressSubmit(e)}>
                  <label htmlFor="dgPrAddressFunnel">Property address</label>
                  <input
                    ref={addressRef}
                    id="dgPrAddressFunnel"
                    type="text"
                    required
                    autoComplete="street-address"
                    value={address}
                    disabled={busy}
                    placeholder="e.g. 123 Main Street, Currumbin Valley QLD"
                    onChange={(e) => setAddress(e.target.value)}
                  />
                  <button type="submit" disabled={busy}>
                    {busy ? "Finding property…" : "Get My Free Report →"}
                  </button>
                  <p className="dg-rr-funnel__note">
                    Takes under a minute. No obligation.
                  </p>
                </form>
              </>
            ) : null}

            {step === "contact" ? (
              <>
                <h2>Almost There!</h2>
                <p className="dg-rr-funnel__sub">
                  Where should we send your Property Value &amp; Buyer Demand
                  Report?
                </p>
                {formatted ? (
                  <p className="dg-rr-funnel__addr">
                    {formatted}
                    <button
                      type="button"
                      onClick={() => {
                        setStep("address");
                        setStatus(null);
                      }}
                    >
                      Change
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
                  <label htmlFor="dgPrNameFunnel">Full name *</label>
                  <input
                    id="dgPrNameFunnel"
                    required
                    value={fullName}
                    disabled={busy}
                    placeholder="Enter your full name"
                    onChange={(e) => setFullName(e.target.value)}
                  />
                  <label htmlFor="dgPrEmailFunnel">Email</label>
                  <input
                    id="dgPrEmailFunnel"
                    type="email"
                    value={email}
                    disabled={busy}
                    placeholder="Enter your email"
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <label htmlFor="dgPrPhoneFunnel">Mobile</label>
                  <input
                    id="dgPrPhoneFunnel"
                    type="tel"
                    value={phone}
                    disabled={busy}
                    placeholder="Enter your mobile"
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <label htmlFor="dgPrTypeFunnel">Property type</label>
                  <select
                    id="dgPrTypeFunnel"
                    value={propertyType}
                    disabled={busy}
                    onChange={(e) => setPropertyType(e.target.value)}
                  >
                    <option value="">Select type</option>
                    {PROPERTY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <label htmlFor="dgPrTimeFunnel">Timeframe to sell</label>
                  <select
                    id="dgPrTimeFunnel"
                    value={timeframe}
                    disabled={busy}
                    onChange={(e) => setTimeframe(e.target.value)}
                  >
                    <option value="">Select timeframe</option>
                    {TIMEFRAMES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <p className="dg-rr-funnel__note" style={{ textAlign: "left", marginBottom: "0.85rem" }}>
                    Name required — plus email or mobile (or both).
                  </p>
                  <button type="submit" disabled={busy}>
                    {busy ? "Generating report…" : "Send My Report →"}
                  </button>
                </form>
              </>
            ) : null}

            {step === "done" ? (
              <div className="dg-rr-funnel__done">
                <h2>You&apos;re all set</h2>
                <p>{doneMessage}</p>
                <a className="dg-rr-cta" href={appraisalHref}>
                  Book a free appraisal →
                </a>
              </div>
            ) : null}

            {status ? (
              <p
                role="status"
                aria-live="polite"
                className={`dg-rr-funnel__status is-${status.type}`}
              >
                {status.text}
              </p>
            ) : (
              <p className="dg-rr-funnel__status" aria-hidden>
                {" "}
              </p>
            )}
          </div>

          <p className="dg-rr-funnel__foot">
            A Roe Realty Property Report™ — powered by DigitalGate.
          </p>
        </div>
      </section>
    </>
  );
}
