"use client";

import { useState, type FormEvent } from "react";

type Props = {
  siteSlug: string;
  basePath?: string;
};

type Step = "address" | "contact" | "done";

export function PropertyReportCapture({ siteSlug, basePath = "" }: Props) {
  const [step, setStep] = useState<Step>("address");
  const [address, setAddress] = useState("");
  const [formatted, setFormatted] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ type: "error" | "ok" | "loading"; text: string } | null>(
    null,
  );
  const [doneMessage, setDoneMessage] = useState("");

  const appraisalHref =
    basePath && basePath !== "/"
      ? `${basePath}/property-appraisal`
      : "/property-appraisal";

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
            <h3
              style={{
                margin: "0 0 0.35rem",
                fontSize: "1.35rem",
                color: "#1C2B2A",
              }}
            >
              Get Your Free Property Report
            </h3>
            <p style={{ margin: "0 0 1.25rem", color: "#5a5a5a", fontSize: "0.95rem" }}>
              Value range · Buyer demand · Comparable sales
            </p>
            <form onSubmit={(e) => void onAddressSubmit(e)}>
              <label
                htmlFor="dgPrAddress"
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  marginBottom: "0.35rem",
                }}
              >
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
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "0.75rem 0.85rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #cfc8c0",
                  marginBottom: "1rem",
                  fontSize: "1rem",
                }}
              />
              <button
                type="submit"
                disabled={busy}
                style={{
                  width: "100%",
                  padding: "0.85rem 1rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: "#1C2B2A",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  cursor: busy ? "wait" : "pointer",
                }}
              >
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
                style={{ position: "absolute", left: "-9999px", height: 0, overflow: "hidden" }}
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
              <label
                htmlFor="dgPrName"
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  marginBottom: "0.35rem",
                }}
              >
                Full name
              </label>
              <input
                id="dgPrName"
                type="text"
                required
                value={fullName}
                disabled={busy}
                onChange={(e) => setFullName(e.target.value)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "0.75rem 0.85rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #cfc8c0",
                  marginBottom: "0.85rem",
                  fontSize: "1rem",
                }}
              />
              <label
                htmlFor="dgPrEmail"
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  marginBottom: "0.35rem",
                }}
              >
                Email
              </label>
              <input
                id="dgPrEmail"
                type="email"
                value={email}
                disabled={busy}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "0.75rem 0.85rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #cfc8c0",
                  marginBottom: "0.85rem",
                  fontSize: "1rem",
                }}
              />
              <label
                htmlFor="dgPrPhone"
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  marginBottom: "0.35rem",
                }}
              >
                Mobile
              </label>
              <input
                id="dgPrPhone"
                type="tel"
                value={phone}
                disabled={busy}
                onChange={(e) => setPhone(e.target.value)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "0.75rem 0.85rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #cfc8c0",
                  marginBottom: "1rem",
                  fontSize: "1rem",
                }}
              />
              <button
                type="submit"
                disabled={busy}
                style={{
                  width: "100%",
                  padding: "0.85rem 1rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: "#1C2B2A",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  cursor: busy ? "wait" : "pointer",
                }}
              >
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
            <p style={{ margin: "0 0 1.25rem", color: "#2F2F2F", lineHeight: 1.55 }}>
              {doneMessage}
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
              Book a free appraisal
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
    </section>
  );
}
