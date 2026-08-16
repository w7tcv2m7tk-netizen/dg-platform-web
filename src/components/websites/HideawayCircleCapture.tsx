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
      <section id="hideaway-circle-form" className="cvh-circle-capture cvh-circle-page">
        <div className="cvh-circle-page__hero">
          <p className="cvh-circle-page__eyebrow">The Hideaway Circle</p>
          <h1 className="cvh-circle-page__title">You&apos;re in</h1>
          <p className="cvh-circle-page__lead">{doneMessage}</p>
          <p className="cvh-circle-page__lead cvh-circle-page__lead--tight">
            Book your next stay direct — your 10% return-stay reward is permanent.
          </p>
          <a
            className="cvh-circle-page__btn"
            href={joinHref(basePath).replace("/hideaway-circle", "/stay") || "/stay"}
          >
            Explore stays
          </a>
        </div>
      </section>
    );
  }

  return (
    <section id="hideaway-circle-form" className="cvh-circle-capture cvh-circle-page">
      <div className="cvh-circle-page__hero">
        <p className="cvh-circle-page__eyebrow">The Hideaway Circle</p>
        <h1 className="cvh-circle-page__title">
          Private offers · First access · Return-stay rewards
        </h1>
        <p className="cvh-circle-page__lead">
          Claim 10% off your next <strong>direct</strong> stay at Currumbin Valley
          Hideaway — and stay connected with the Valley.
        </p>
      </div>

      <div className="cvh-circle-page__form-wrap">
        <form className="cvh-circle-page__form" onSubmit={(e) => void onSubmit(e)}>
          <p className="cvh-circle-page__section">Your details</p>
          <label htmlFor="hcFirst" className="cvh-circle-page__label">
            First name
          </label>
          <input
            id="hcFirst"
            className="cvh-circle-page__field"
            required
            value={firstName}
            disabled={busy}
            onChange={(e) => setFirstName(e.target.value)}
          />

          <label htmlFor="hcEmail" className="cvh-circle-page__label">
            Email
          </label>
          <input
            id="hcEmail"
            className="cvh-circle-page__field"
            type="email"
            required
            value={email}
            disabled={busy}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label htmlFor="hcPhone" className="cvh-circle-page__label">
            Mobile
          </label>
          <input
            id="hcPhone"
            className="cvh-circle-page__field"
            type="tel"
            required
            value={phone}
            disabled={busy}
            onChange={(e) => setPhone(e.target.value)}
          />

          <div className="cvh-circle-page__row">
            <div>
              <label htmlFor="hcBday" className="cvh-circle-page__label">
                Birthday month <span className="cvh-circle-page__optional">optional</span>
              </label>
              <select
                id="hcBday"
                className="cvh-circle-page__field"
                value={birthdayMonth}
                disabled={busy}
                onChange={(e) => setBirthdayMonth(e.target.value)}
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
              <label htmlFor="hcAnn" className="cvh-circle-page__label">
                Anniversary <span className="cvh-circle-page__optional">optional</span>
              </label>
              <input
                id="hcAnn"
                className="cvh-circle-page__field"
                type="text"
                placeholder="MM-DD"
                value={anniversaryDate}
                disabled={busy}
                onChange={(e) => setAnniversaryDate(e.target.value)}
              />
            </div>
          </div>

          <p className="cvh-circle-page__section">
            Tell us a little about what brings you to the Valley
          </p>
          <div className="cvh-circle-page__checks">
            {INTERESTS.map((item) => (
              <label key={item.id} className="cvh-circle-page__check">
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

          <p className="cvh-circle-page__section">I&apos;d like to hear about</p>
          <div className="cvh-circle-page__checks">
            {TOPICS.map((item) => (
              <label key={item.id} className="cvh-circle-page__check">
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
            className="cvh-circle-page__hp"
          />

          {status ? (
            <p
              className={
                status.type === "error"
                  ? "cvh-circle-page__status cvh-circle-page__status--error"
                  : "cvh-circle-page__status"
              }
            >
              {status.text}
            </p>
          ) : null}

          <button type="submit" disabled={busy} className="cvh-circle-page__btn">
            {busy ? "Joining…" : "Claim my 10% return-stay reward"}
          </button>
          <p className="cvh-circle-page__fine">
            Direct bookings only — not valid via Airbnb or Booking.com. Your reward does
            not expire.
          </p>
        </form>
      </div>
    </section>
  );
}

export function HideawayCircleHomepageCta({ basePath = "" }: { basePath?: string }) {
  const href = `${joinHref(basePath)}?src=home`;
  return (
    <section className="cvh-circle-home-cta" aria-labelledby="cvh-circle-home-heading">
      <div className="cvh-circle-home-cta__inner">
        <p className="cvh-circle-home-cta__badge">The Hideaway Circle</p>
        <h2 id="cvh-circle-home-heading" className="cvh-circle-home-cta__headline">
          Come Back to the Valley
        </h2>
        <p className="cvh-circle-home-cta__copy">
          Loved your stay? Join the Hideaway Circle and receive 10% off your next
          direct booking.
        </p>
        <a href={href} className="cvh-circle-home-cta__btn">
          Join the Hideaway Circle <span aria-hidden>→</span>
        </a>
      </div>
    </section>
  );
}

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
