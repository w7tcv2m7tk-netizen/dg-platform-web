"use client";

import { useEffect, useState, type CSSProperties, type FormEvent } from "react";

type Props = {
  siteSlug: string;
  basePath?: string;
};

const INTERESTS = [
  { id: "romantic", label: "Romantic escape" },
  { id: "weekend", label: "Weekend getaway" },
  { id: "nature", label: "Nature & rainforest" },
  { id: "wellness", label: "Wellness & relaxation" },
  { id: "celebration", label: "Celebration" },
  { id: "events", label: "Events" },
] as const;

const TOPICS = [
  { id: "offers", label: "Special offers" },
  { id: "new_accommodation", label: "New accommodation" },
  { id: "events", label: "Events & experiences" },
  { id: "seasonal", label: "Seasonal escapes" },
] as const;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function joinHref(basePath: string) {
  const base = basePath && basePath !== "/" ? basePath.replace(/\/$/, "") : "";
  return `${base}/hideaway-circle`;
}

function readQueryPrefill() {
  if (typeof window === "undefined") {
    return { src: "website", firstName: "", email: "", print: false };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    src: params.get("src")?.trim() || "website",
    firstName: params.get("firstName")?.trim() || params.get("name")?.trim() || "",
    email: params.get("email")?.trim() || "",
    print: params.get("print") === "1",
  };
}

export function HideawayCircleCapture({ siteSlug, basePath = "" }: Props) {
  const [joinSource, setJoinSource] = useState("website");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthdayMonth, setBirthdayMonth] = useState<string>("");
  const [anniversaryDate, setAnniversaryDate] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [honeypot, setHoneypot] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [doneMessage, setDoneMessage] = useState("");
  const [printMode, setPrintMode] = useState(false);
  const [status, setStatus] = useState<{ type: "error" | "ok"; text: string } | null>(
    null,
  );

  useEffect(() => {
    const prefill = readQueryPrefill();
    setJoinSource(prefill.src);
    if (prefill.firstName) setFirstName(prefill.firstName);
    if (prefill.email) setEmail(prefill.email);
    setPrintMode(prefill.print);
  }, []);

  const circleUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${joinHref(basePath)}?src=qr`
      : `https://currumbinvalleyhideaway.com.au/hideaway-circle?src=qr`;

  function toggle(list: string[], id: string, set: (n: string[]) => void) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) {
      setStatus({ type: "error", text: "Please enter your first name." });
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setStatus({ type: "error", text: "Please enter a valid email." });
      return;
    }
    if (!phone.trim()) {
      setStatus({ type: "error", text: "Please enter your mobile number." });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/public/hideaway-circle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          siteSlug,
          firstName: firstName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          birthdayMonth: birthdayMonth ? Number(birthdayMonth) : null,
          anniversaryDate: anniversaryDate.trim() || null,
          interests,
          topics,
          joinSource,
          websiteHp: honeypot,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        data?: { message?: string };
        error?: { message?: string };
      };
      if (!res.ok) {
        setStatus({
          type: "error",
          text: json?.error?.message || "Could not join just now — please try again.",
        });
        setBusy(false);
        return;
      }
      setDoneMessage(
        json?.data?.message ||
          "You're in The Hideaway Circle. Your 10% applies on your next direct booking.",
      );
      setDone(true);
    } catch {
      setStatus({ type: "error", text: "Network error. Please try again." });
    }
    setBusy(false);
  }

  if (printMode) {
    return (
      <div className="cvh-circle-print" style={printWrap}>
        <p style={printEyebrow}>Currumbin Valley Hideaway</p>
        <h1 style={printTitle}>Loved your stay?</h1>
        <p style={printLead}>We&apos;d love to welcome you back.</p>
        <h2 style={printBrand}>Join the Hideaway Circle</h2>
        <p style={printBody}>and receive 10% off your next direct stay.</p>
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(circleUrl)}`}
          alt="Scan to join The Hideaway Circle"
          width={220}
          height={220}
          style={{ margin: "1.5rem auto", display: "block" }}
        />
        <p style={printScan}>Scan to join</p>
        <p style={printUrl}>{circleUrl}</p>
      </div>
    );
  }

  if (done) {
    return (
      <section id="hideaway-circle-form" className="cvh-circle-capture" style={shell}>
        <div style={card}>
          <p style={eyebrow}>The Hideaway Circle</p>
          <h2 style={heading}>You&apos;re in</h2>
          <p style={lead}>{doneMessage}</p>
          <p style={{ ...lead, marginBottom: 0 }}>
            Book your next stay direct — your 10% return-stay reward is permanent.
          </p>
          <a href={joinHref(basePath).replace("/hideaway-circle", "/stay") || "/stay"} style={btnStyle}>
            Explore stays
          </a>
        </div>
      </section>
    );
  }

  return (
    <section id="hideaway-circle-form" className="cvh-circle-capture" style={shell}>
      <div style={card}>
        <p style={eyebrow}>The Hideaway Circle</p>
        <h1 style={heading}>Private offers · First access · Return-stay rewards</h1>
        <p style={lead}>
          Claim 10% off your next <strong>direct</strong> stay at Currumbin Valley Hideaway —
          and stay connected with the Valley.
        </p>

        <form onSubmit={(e) => void onSubmit(e)}>
          <p style={sectionLabel}>Your details</p>
          <label htmlFor="hcFirst" style={labelStyle}>
            First name
          </label>
          <input
            id="hcFirst"
            required
            value={firstName}
            disabled={busy}
            onChange={(e) => setFirstName(e.target.value)}
            style={fieldStyle}
          />

          <label htmlFor="hcEmail" style={labelStyle}>
            Email
          </label>
          <input
            id="hcEmail"
            type="email"
            required
            value={email}
            disabled={busy}
            onChange={(e) => setEmail(e.target.value)}
            style={fieldStyle}
          />

          <label htmlFor="hcPhone" style={labelStyle}>
            Mobile
          </label>
          <input
            id="hcPhone"
            type="tel"
            required
            value={phone}
            disabled={busy}
            onChange={(e) => setPhone(e.target.value)}
            style={fieldStyle}
          />

          <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "1fr 1fr" }}>
            <div>
              <label htmlFor="hcBday" style={labelStyle}>
                Birthday month <span style={optional}>optional</span>
              </label>
              <select
                id="hcBday"
                value={birthdayMonth}
                disabled={busy}
                onChange={(e) => setBirthdayMonth(e.target.value)}
                style={fieldStyle}
              >
                <option value="">—</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={String(i + 1)}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="hcAnn" style={labelStyle}>
                Anniversary <span style={optional}>optional</span>
              </label>
              <input
                id="hcAnn"
                type="text"
                placeholder="MM-DD"
                value={anniversaryDate}
                disabled={busy}
                onChange={(e) => setAnniversaryDate(e.target.value)}
                style={fieldStyle}
              />
            </div>
          </div>

          <p style={sectionLabel}>Tell us a little about what brings you to the Valley</p>
          <div style={checkGrid}>
            {INTERESTS.map((item) => (
              <label key={item.id} style={checkLabel}>
                <input
                  type="checkbox"
                  checked={interests.includes(item.id)}
                  disabled={busy}
                  onChange={() => toggle(interests, item.id, setInterests)}
                />
                {item.label}
              </label>
            ))}
          </div>

          <p style={sectionLabel}>I&apos;d like to hear about</p>
          <div style={checkGrid}>
            {TOPICS.map((item) => (
              <label key={item.id} style={checkLabel}>
                <input
                  type="checkbox"
                  checked={topics.includes(item.id)}
                  disabled={busy}
                  onChange={() => toggle(topics, item.id, setTopics)}
                />
                {item.label}
              </label>
            ))}
          </div>

          <input
            type="text"
            name="website"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0 }}
          />

          {status ? (
            <p
              style={{
                color: status.type === "error" ? "#b45309" : "#3f6212",
                fontSize: "0.9rem",
                margin: "0.75rem 0 0",
              }}
            >
              {status.text}
            </p>
          ) : null}

          <button type="submit" disabled={busy} style={btnStyle}>
            {busy ? "Joining…" : "Claim my 10% return-stay reward"}
          </button>
          <p style={finePrint}>
            Direct bookings only — not valid via Airbnb or Booking.com. Your reward does not expire.
          </p>
        </form>
      </div>
    </section>
  );
}

export function HideawayCircleHomepageCta({ basePath = "" }: { basePath?: string }) {
  const href = `${joinHref(basePath)}?src=home`;
  return (
    <section className="cvh-circle-home-cta" style={homeCta}>
      <div style={homeInner}>
        <p style={{ ...eyebrow, color: "#6b5c4c" }}>The Hideaway Circle</p>
        <h2 style={{ ...heading, fontSize: "1.75rem", marginBottom: "0.5rem" }}>
          Come Back to the Valley
        </h2>
        <p style={{ ...lead, maxWidth: "36rem", margin: "0 auto 1.25rem" }}>
          Loved your stay? Join the Hideaway Circle and receive 10% off your next direct booking.
        </p>
        <a href={href} style={btnStyle}>
          Join the Hideaway Circle →
        </a>
      </div>
    </section>
  );
}

const shell: CSSProperties = {
  padding: "2.5rem 1.25rem 3.5rem",
  background: "linear-gradient(180deg, #f5f2ef 0%, #ebe4db 100%)",
};

const card: CSSProperties = {
  maxWidth: "36rem",
  margin: "0 auto",
  background: "#faf7f2",
  borderRadius: "0.25rem",
  padding: "2rem 1.5rem",
  border: "1px solid rgba(107, 92, 76, 0.18)",
  boxShadow: "0 18px 40px rgba(60, 45, 30, 0.08)",
  fontFamily: '"Segoe UI", Georgia, serif',
  color: "#2c241c",
};

const eyebrow: CSSProperties = {
  margin: "0 0 0.5rem",
  fontSize: "0.72rem",
  fontWeight: 600,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "#8a735a",
};

const heading: CSSProperties = {
  margin: "0 0 0.65rem",
  fontSize: "1.55rem",
  fontWeight: 500,
  lineHeight: 1.25,
  color: "#2c241c",
};

const lead: CSSProperties = {
  margin: "0 0 1.5rem",
  fontSize: "0.98rem",
  lineHeight: 1.55,
  color: "#5c4f42",
};

const sectionLabel: CSSProperties = {
  margin: "1.35rem 0 0.65rem",
  fontSize: "0.8rem",
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "#6b5c4c",
};

const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: "0.35rem",
  fontSize: "0.85rem",
  color: "#5c4f42",
};

const optional: CSSProperties = {
  fontWeight: 400,
  fontSize: "0.75rem",
  color: "#9a8b7a",
  textTransform: "none",
  letterSpacing: 0,
};

const fieldStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  marginBottom: "0.85rem",
  padding: "0.7rem 0.85rem",
  borderRadius: "0.2rem",
  border: "1px solid rgba(107, 92, 76, 0.28)",
  background: "#fff",
  color: "#2c241c",
  fontSize: "1rem",
};

const checkGrid: CSSProperties = {
  display: "grid",
  gap: "0.45rem",
  marginBottom: "0.5rem",
};

const checkLabel: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.55rem",
  fontSize: "0.92rem",
  color: "#3d342b",
};

const btnStyle: CSSProperties = {
  display: "inline-block",
  marginTop: "1.25rem",
  padding: "0.85rem 1.35rem",
  borderRadius: "999px",
  border: "none",
  background: "#3d342b",
  color: "#faf7f2",
  fontSize: "0.92rem",
  fontWeight: 600,
  letterSpacing: "0.03em",
  textTransform: "uppercase",
  textDecoration: "none",
  cursor: "pointer",
};

const finePrint: CSSProperties = {
  margin: "0.85rem 0 0",
  fontSize: "0.78rem",
  color: "#8a7a68",
  lineHeight: 1.45,
};

const homeCta: CSSProperties = {
  padding: "3.5rem 1.25rem",
  background: "linear-gradient(180deg, #ebe4db 0%, #f5f2ef 100%)",
  borderTop: "1px solid rgba(107, 92, 76, 0.12)",
};

const homeInner: CSSProperties = {
  maxWidth: "40rem",
  margin: "0 auto",
  textAlign: "center",
  fontFamily: '"Segoe UI", Georgia, serif',
};

const printWrap: CSSProperties = {
  maxWidth: "28rem",
  margin: "2rem auto",
  padding: "2.5rem 1.75rem",
  textAlign: "center",
  background: "#faf7f2",
  border: "1px solid rgba(107, 92, 76, 0.25)",
  fontFamily: "Georgia, serif",
  color: "#2c241c",
};

const printEyebrow: CSSProperties = {
  margin: 0,
  fontSize: "0.7rem",
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "#8a735a",
};

const printTitle: CSSProperties = {
  margin: "1rem 0 0.35rem",
  fontSize: "1.85rem",
  fontWeight: 500,
};

const printLead: CSSProperties = {
  margin: "0 0 1.25rem",
  color: "#5c4f42",
};

const printBrand: CSSProperties = {
  margin: "0 0 0.35rem",
  fontSize: "1.25rem",
  fontWeight: 600,
};

const printBody: CSSProperties = {
  margin: 0,
  color: "#5c4f42",
};

const printScan: CSSProperties = {
  margin: "0.5rem 0 0",
  fontSize: "0.85rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const printUrl: CSSProperties = {
  margin: "0.5rem 0 0",
  fontSize: "0.7rem",
  color: "#8a7a68",
  wordBreak: "break-all",
};
