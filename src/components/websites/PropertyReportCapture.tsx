"use client";

import { useState, type CSSProperties, type FormEvent } from "react";

type Props = {
  siteSlug: string;
  basePath?: string;
  /** Dedicated subdomain funnel vs embedded brand-site page. */
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

  const appraisalHref =
    basePath && basePath !== "/"
      ? `${basePath}/property-appraisal`
      : "https://roerealty.com.au/property-appraisal";
  const brandHref = "https://roerealty.com.au";

  async function onAddressSubmit(e: FormEvent) {
    e.preventDefault();
    const raw = address.trim();
    if (!raw) {
      setStatus({ type: "error", text: "Enter your property address." });
      return;
    }
    setBusy(true);
    setStatus({ type: "loading", text: "Finding address…" });
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
      text: "Generating your Cotality property report…",
    });
    try {
      const res = await fetch("/api/public/property-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          siteSlug,
          propertyAddress: formatted || address,
          fullName: name,
          email: email.trim(),
          phone: phone.trim(),
          propertyType: propertyType.trim(),
          timeframe: timeframe.trim(),
          website: honeypot,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        data?: { message?: string; reportSent?: boolean };
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

  const fieldStyle: CSSProperties = {
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
  const labelStyle: CSSProperties = {
    display: "block",
    fontSize: "0.8rem",
    fontWeight: 600,
    marginBottom: "0.35rem",
    color: "#1C2B2A",
  };
  const btnStyle: CSSProperties = {
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

  const card = (
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
          {!isFunnel ? (
            <>
              <h3
                style={{
                  margin: "0 0 0.35rem",
                  fontSize: "1.35rem",
                  color: "#1C2B2A",
                }}
              >
                Get Your Free Property Report
              </h3>
              <p
                style={{
                  margin: "0 0 1.25rem",
                  color: "#5a5a5a",
                  fontSize: "0.95rem",
                }}
              >
                Value range · Buyer demand · Comparable sales
              </p>
            </>
          ) : (
            <p
              style={{
                margin: "0 0 1rem",
                fontSize: "0.85rem",
                color: "#5a5a5a",
              }}
            >
              Value range · Buyer demand · Comparable sales
            </p>
          )}
          <form onSubmit={(e) => void onAddressSubmit(e)}>
            <label htmlFor="dgPrAddress" style={labelStyle}>
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
              style={fieldStyle}
            />
            <button type="submit" disabled={busy} style={btnStyle}>
              {busy ? "Finding address…" : "Get My Free Report"}
            </button>
          </form>
        </>
      ) : null}

      {step === "contact" ? (
        <>
          <h3
            style={{
              margin: "0 0 0.35rem",
              fontSize: "1.35rem",
              color: "#1C2B2A",
            }}
          >
            Almost there
          </h3>
          <p
            style={{
              margin: "0 0 0.75rem",
              color: "#5a5a5a",
              fontSize: "0.95rem",
            }}
          >
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
                color: "#1C2B2A",
              }}
            >
              {formatted}
              <button
                type="button"
                onClick={() => {
                  setStep("address");
                  setStatus(null);
                }}
                style={{
                  marginLeft: "0.75rem",
                  border: "none",
                  background: "transparent",
                  color: "#6B5428",
                  textDecoration: "underline",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                }}
              >
                Change
              </button>
            </p>
          ) : null}
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
            <label htmlFor="dgPrName" style={labelStyle}>
              Full name
            </label>
            <input
              id="dgPrName"
              type="text"
              required
              value={fullName}
              disabled={busy}
              onChange={(e) => setFullName(e.target.value)}
              style={fieldStyle}
            />
            <label htmlFor="dgPrEmail" style={labelStyle}>
              Email
            </label>
            <input
              id="dgPrEmail"
              type="email"
              value={email}
              disabled={busy}
              onChange={(e) => setEmail(e.target.value)}
              style={fieldStyle}
            />
            <label htmlFor="dgPrPhone" style={labelStyle}>
              Mobile
            </label>
            <input
              id="dgPrPhone"
              type="tel"
              value={phone}
              disabled={busy}
              onChange={(e) => setPhone(e.target.value)}
              style={fieldStyle}
            />
            {isFunnel ? (
              <>
                <label htmlFor="dgPrType" style={labelStyle}>
                  Property type
                </label>
                <select
                  id="dgPrType"
                  value={propertyType}
                  disabled={busy}
                  onChange={(e) => setPropertyType(e.target.value)}
                  style={fieldStyle}
                >
                  <option value="">Select type</option>
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <label htmlFor="dgPrTime" style={labelStyle}>
                  Estimated timeframe to sell
                </label>
                <select
                  id="dgPrTime"
                  value={timeframe}
                  disabled={busy}
                  onChange={(e) => setTimeframe(e.target.value)}
                  style={{ ...fieldStyle, marginBottom: "1rem" }}
                >
                  <option value="">Select timeframe</option>
                  {TIMEFRAMES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </>
            ) : null}
            <button type="submit" disabled={busy} style={btnStyle}>
              {busy ? "Generating report…" : "Send My Report"}
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
              color: "#1C2B2A",
            }}
          >
            You&apos;re all set
          </h3>
          <p
            style={{
              margin: "0 0 1.25rem",
              color: "#2F2F2F",
              lineHeight: 1.55,
            }}
          >
            {doneMessage}
          </p>
          <p
            style={{
              margin: "0 0 1.25rem",
              color: "#5a5a5a",
              fontSize: "0.95rem",
              lineHeight: 1.5,
            }}
          >
            Your free report leads with Cotality&apos;s estimated value range
            and recent sales when available. Want a full CMA and buyer-demand
            strategy?
          </p>
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
          aria-live="polite"
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
  );

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
        {card}
      </section>
    );
  }

  return (
    <section
      id="property-report-form"
      className="dg-property-report-capture dg-property-report-funnel"
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(165deg, #1C2B2A 0%, #243836 42%, #F5F2EF 42%)",
        color: "#1C2B2A",
        padding: "2rem clamp(1rem, 3vw, 2.5rem) 3.5rem",
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}
    >
      <div style={{ maxWidth: "40rem", margin: "0 auto 2rem" }}>
        <a
          href={brandHref}
          style={{
            display: "inline-block",
            marginBottom: "1.5rem",
            color: "#C9A46C",
            textDecoration: "none",
            fontFamily: "system-ui, sans-serif",
            fontSize: "0.85rem",
            fontWeight: 600,
            letterSpacing: "0.04em",
          }}
        >
          Roe Realty
        </a>
        <p
          style={{
            margin: "0 0 0.75rem",
            fontFamily: "system-ui, sans-serif",
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#C9A46C",
          }}
        >
          ⭐ Free Instant Report
        </p>
        <h1
          style={{
            margin: "0 0 0.85rem",
            fontSize: "clamp(1.75rem, 4vw, 2.35rem)",
            lineHeight: 1.2,
            color: "#fff",
            fontWeight: 600,
          }}
        >
          Find Out What Buyers Would Pay for Your Property Right Now
        </h1>
        <p
          style={{
            margin: "0 0 1.35rem",
            fontFamily: "system-ui, sans-serif",
            fontSize: "1.05rem",
            lineHeight: 1.55,
            color: "rgba(245, 242, 239, 0.88)",
          }}
        >
          Receive a value range, recent comparable sales, and buyer demand
          insights in minutes.
        </p>
        <ul
          style={{
            margin: "0 0 2rem",
            padding: 0,
            listStyle: "none",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.65rem 1.25rem",
            fontFamily: "system-ui, sans-serif",
            fontSize: "0.9rem",
            color: "rgba(245, 242, 239, 0.9)",
          }}
        >
          {["Buyer demand analytics", "Instant valuation", "No obligation"].map(
            (item) => (
              <li key={item} style={{ display: "flex", gap: "0.4rem" }}>
                <span aria-hidden style={{ color: "#C9A46C" }}>
                  ✓
                </span>
                {item}
              </li>
            ),
          )}
        </ul>
      </div>
      {card}
      <p
        style={{
          margin: "1.75rem auto 0",
          maxWidth: "32rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          fontSize: "0.8rem",
          color: "#5a5a5a",
        }}
      >
        A Roe Realty Property Report™ — powered by DigitalGate.
      </p>
    </section>
  );
}
