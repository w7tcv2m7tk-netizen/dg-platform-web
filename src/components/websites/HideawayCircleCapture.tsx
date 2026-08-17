"use client";

import { useEffect, useState, type CSSProperties, type FormEvent } from "react";

type Props = {
  siteSlug: string;
  basePath?: string;
  variant?: "funnel" | "embedded";
  logoUrl?: string | null;
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

const DEFAULT_LOGO =
  "https://dhcfjdm3qhtlfaul.public.blob.vercel-storage.com/org-assets/cmsi1mggj0000ib04kvavtx4p/cfcf6c1c3eba0e66-1dYcEBoRCte8kCa2PnbEeJ1Z8GRWzf.png";

const CVH_ICON = DEFAULT_LOGO;

const HERO_IMAGE =
  "https://dhcfjdm3qhtlfaul.public.blob.vercel-storage.com/org-assets/cmsi1mggj0000ib04kvavtx4p/wp-migrate/f887cae9510f748f.jpeg";

const FUNNEL_CSS = `
@import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@560;700&family=Manrope:wght@500;600;700;800&display=swap");
@keyframes dgCvhIn {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .dg-cvh-funnel * { animation: none !important; transition: none !important; }
}
.dg-cvh-funnel {
  --cvh-ink: #f7f4ef;
  --cvh-gold: #C9A46C;
  --cvh-deep: #1a2a24;
  --cvh-panel: rgba(14, 24, 20, 0.78);
  position: relative;
  width: 100%;
  min-height: 100dvh;
  display: flex;
  align-items: stretch;
  overflow: clip;
  color: var(--cvh-ink);
  font-family: Manrope, system-ui, sans-serif;
  background: #0c1612;
}
.dg-cvh-funnel__bg {
  position: absolute;
  inset: 0;
  background-image: var(--cvh-hero);
  background-size: cover;
  background-position: center 40%;
  transform: scale(1.04);
}
.dg-cvh-funnel__veil {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(105deg, rgba(10, 20, 16, 0.92) 0%, rgba(10, 20, 16, 0.72) 42%, rgba(10, 20, 16, 0.4) 100%),
    linear-gradient(0deg, rgba(6, 12, 10, 0.55) 0%, transparent 38%);
}
.dg-cvh-funnel__shell {
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
.dg-cvh-funnel__brand {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  color: var(--cvh-gold);
  text-decoration: none;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.dg-cvh-funnel__brand-logo {
  height: clamp(2.4rem, 5vw, 3.2rem);
  width: auto;
  max-width: min(280px, 74vw);
  display: block;
  object-fit: contain;
  object-position: left center;
  filter: drop-shadow(0 4px 14px rgba(0,0,0,0.45));
}
.dg-cvh-funnel__copy { animation: dgCvhIn 0.55s ease both; }
.dg-cvh-funnel__eyebrow {
  margin: 1.35rem 0 0.85rem;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--cvh-gold);
}
.dg-cvh-funnel h1 {
  margin: 0 0 1rem;
  font-family: "Cormorant Garamond", Georgia, serif;
  font-size: clamp(2.15rem, 4.8vw, 3.35rem);
  line-height: 1.12;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #fff;
  text-wrap: balance;
}
.dg-cvh-funnel__lede {
  margin: 0 0 1.5rem;
  max-width: 34rem;
  font-size: clamp(1.02rem, 1.6vw, 1.18rem);
  line-height: 1.55;
  color: rgba(247, 244, 239, 0.88);
}
.dg-cvh-funnel__trust {
  display: grid;
  gap: 0.65rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.dg-cvh-funnel__trust li {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  color: rgba(247, 244, 239, 0.92);
  font-size: 0.95rem;
  font-weight: 600;
}
.dg-cvh-funnel__trust i {
  width: 1.45rem;
  height: 1.45rem;
  border-radius: 999px;
  display: inline-grid;
  place-items: center;
  background: rgba(201, 164, 108, 0.18);
  color: var(--cvh-gold);
  font-style: normal;
  font-size: 0.75rem;
  font-weight: 800;
}
.dg-cvh-funnel__panel {
  animation: dgCvhIn 0.65s ease 0.08s both;
  background: var(--cvh-panel);
  border: 1px solid rgba(201, 164, 108, 0.28);
  border-radius: 1.25rem;
  padding: clamp(1.35rem, 3vw, 1.85rem);
  box-shadow: 0 28px 60px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(14px);
  max-height: min(92dvh, 920px);
  overflow: auto;
}
.dg-cvh-funnel__badge {
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
.dg-cvh-funnel__panel h2 {
  margin: 0 0 0.4rem;
  font-family: "Cormorant Garamond", Georgia, serif;
  font-size: clamp(1.45rem, 2.5vw, 1.75rem);
  color: #fff;
  font-weight: 700;
}
.dg-cvh-funnel__sub {
  margin: 0 0 1.25rem;
  color: rgba(247, 244, 239, 0.72);
  font-size: 0.95rem;
}
.dg-cvh-funnel label {
  display: block;
  margin: 0 0 0.4rem;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(247, 244, 239, 0.78);
}
.dg-cvh-funnel input:not([type="checkbox"]),
.dg-cvh-funnel select {
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 0.95rem;
  padding: 0.95rem 1rem;
  border-radius: 0.7rem;
  border: 1.5px solid rgba(201, 164, 108, 0.55);
  background: rgba(12, 22, 18, 0.85);
  color: #fff;
  font: inherit;
  font-size: 1rem;
  font-weight: 600;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.dg-cvh-funnel input:focus,
.dg-cvh-funnel select:focus {
  border-color: #fff;
  box-shadow: 0 0 0 3px rgba(201, 164, 108, 0.28);
}
.dg-cvh-funnel input::placeholder { color: rgba(247,244,239,0.45); font-weight: 500; }
.dg-cvh-funnel__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
.dg-cvh-funnel__section {
  margin: 0.35rem 0 0.65rem;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--cvh-gold);
}
.dg-cvh-funnel__checks {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.45rem 0.75rem;
  margin: 0 0 1rem;
}
.dg-cvh-funnel__check {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0;
  font-size: 0.88rem;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
  color: rgba(247, 244, 239, 0.9);
  cursor: pointer;
}
.dg-cvh-funnel__check input {
  width: auto;
  margin: 0;
  accent-color: var(--cvh-gold);
}
.dg-cvh-funnel button[type="submit"],
.dg-cvh-funnel .dg-cvh-cta {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 0.35rem;
  padding: 1rem 1.25rem;
  border: 0;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, #d4b37a, #C9A46C 45%, #a8844a);
  color: #14201c;
  font: inherit;
  font-size: 1.02rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  cursor: pointer;
  text-decoration: none;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.28);
  transition: transform 0.15s ease, filter 0.15s ease;
}
.dg-cvh-funnel button[type="submit"]:hover,
.dg-cvh-funnel .dg-cvh-cta:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
}
.dg-cvh-funnel button[type="submit"]:disabled {
  opacity: 0.65;
  cursor: wait;
  transform: none;
}
.dg-cvh-funnel__fine {
  margin: 0.85rem 0 0;
  font-size: 0.78rem;
  line-height: 1.45;
  color: rgba(247, 244, 239, 0.55);
  text-align: center;
}
.dg-cvh-funnel__status {
  min-height: 1.35rem;
  margin: 0.5rem 0 0;
  font-size: 0.88rem;
  font-weight: 600;
  color: rgba(247, 244, 239, 0.75);
}
.dg-cvh-funnel__status.is-error { color: #ffb4a8; }
.dg-cvh-funnel__hp {
  position: absolute;
  left: -9999px;
  opacity: 0;
  height: 0;
  width: 0;
}
.dg-cvh-funnel__done { text-align: center; }
.dg-cvh-funnel__done h2 { margin-bottom: 0.75rem; }
.dg-cvh-funnel__done p { margin: 0 0 1.35rem; color: rgba(247,244,239,0.8); line-height: 1.55; }
.dg-cvh-funnel__done a.dg-cvh-cta { text-decoration: none; }
.dg-cvh-funnel__foot {
  grid-column: 1 / -1;
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  text-align: center;
  font-size: 0.78rem;
  color: rgba(247, 244, 239, 0.55);
}
.dg-cvh-funnel__brand-icons {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.dg-cvh-funnel__brand-icons a {
  display: inline-flex;
  opacity: 0.92;
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.dg-cvh-funnel__brand-icons a:hover {
  opacity: 1;
  transform: translateY(-1px);
}
.dg-cvh-funnel__brand-icons img {
  width: 3rem;
  height: 3rem;
  object-fit: contain;
  border-radius: 0.45rem;
  filter: drop-shadow(0 4px 12px rgba(0,0,0,0.45));
}
@media (max-width: 860px) {
  .dg-cvh-funnel__shell {
    grid-template-columns: 1fr;
    align-content: center;
    gap: 1.5rem;
    padding-top: 2.25rem;
    padding-bottom: 2.25rem;
  }
  .dg-cvh-funnel__trust {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem 1rem;
  }
  .dg-cvh-funnel__checks,
  .dg-cvh-funnel__row {
    grid-template-columns: 1fr;
  }
}
`;

function joinHref(basePath: string) {
  const base = basePath && basePath !== "/" ? basePath.replace(/\/$/, "") : "";
  return `${base}/hideaway-circle`;
}

function stayHref(basePath: string) {
  const base = basePath && basePath !== "/" ? basePath.replace(/\/$/, "") : "";
  return `${base}/stay` || "/stay";
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

export function HideawayCircleCapture({
  siteSlug,
  basePath = "",
  variant = "funnel",
  logoUrl,
}: Props) {
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

  const brandLogo = logoUrl?.trim() || DEFAULT_LOGO;
  const isFunnel = variant === "funnel";

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

  const formBody = done ? (
    <div className="dg-cvh-funnel__done">
      <span className="dg-cvh-funnel__badge">The Hideaway Circle</span>
      <h2>You&apos;re in</h2>
      <p>{doneMessage}</p>
      <p>Book your next stay direct — your 10% return-stay reward is permanent.</p>
      <a className="dg-cvh-cta" href={stayHref(basePath)}>
        Explore stays
      </a>
    </div>
  ) : (
    <form onSubmit={(e) => void onSubmit(e)}>
      <span className="dg-cvh-funnel__badge">Member join</span>
      <h2>Claim your 10%</h2>
      <p className="dg-cvh-funnel__sub">
        Direct bookings only — not valid via Airbnb or Booking.com.
      </p>

      <label htmlFor="hcFirst">First name</label>
      <input
        id="hcFirst"
        required
        value={firstName}
        disabled={busy}
        onChange={(e) => setFirstName(e.target.value)}
      />

      <label htmlFor="hcEmail">Email</label>
      <input
        id="hcEmail"
        type="email"
        required
        value={email}
        disabled={busy}
        onChange={(e) => setEmail(e.target.value)}
      />

      <label htmlFor="hcPhone">Mobile</label>
      <input
        id="hcPhone"
        type="tel"
        required
        value={phone}
        disabled={busy}
        onChange={(e) => setPhone(e.target.value)}
      />

      <div className="dg-cvh-funnel__row">
        <div>
          <label htmlFor="hcBday">Birthday month</label>
          <select
            id="hcBday"
            value={birthdayMonth}
            disabled={busy}
            onChange={(e) => setBirthdayMonth(e.target.value)}
          >
            <option value="">Optional</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={String(i + 1)}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="hcAnniv">Anniversary</label>
          <input
            id="hcAnniv"
            type="date"
            value={anniversaryDate}
            disabled={busy}
            onChange={(e) => setAnniversaryDate(e.target.value)}
          />
        </div>
      </div>

      <p className="dg-cvh-funnel__section">What brings you to the Valley</p>
      <div className="dg-cvh-funnel__checks">
        {INTERESTS.map((item) => (
          <label key={item.id} className="dg-cvh-funnel__check">
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

      <p className="dg-cvh-funnel__section">I&apos;d like to hear about</p>
      <div className="dg-cvh-funnel__checks">
        {TOPICS.map((item) => (
          <label key={item.id} className="dg-cvh-funnel__check">
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
        className="dg-cvh-funnel__hp"
      />

      {status ? (
        <p
          className={`dg-cvh-funnel__status${status.type === "error" ? " is-error" : ""}`}
          role="status"
        >
          {status.text}
        </p>
      ) : (
        <p className="dg-cvh-funnel__status" aria-hidden>
          {" "}
        </p>
      )}

      <button type="submit" disabled={busy}>
        {busy ? "Joining…" : "Claim my 10% return-stay reward"}
      </button>
      <p className="dg-cvh-funnel__fine">
        Your reward does not expire. Book direct to redeem.
      </p>
    </form>
  );

  if (!isFunnel) {
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
        <div className="cvh-circle-page__form-wrap">{formBody}</div>
      </section>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: FUNNEL_CSS }} />
      <section
        id="hideaway-circle-form"
        className="dg-cvh-funnel"
        style={{ ["--cvh-hero" as string]: `url("${HERO_IMAGE}")` } as CSSProperties}
      >
        <div className="dg-cvh-funnel__bg" aria-hidden />
        <div className="dg-cvh-funnel__veil" aria-hidden />
        <div className="dg-cvh-funnel__shell">
          <div className="dg-cvh-funnel__copy">
            <a className="dg-cvh-funnel__brand" href={stayHref(basePath) || "/"}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="dg-cvh-funnel__brand-logo"
                src={brandLogo}
                alt="Currumbin Valley Hideaway"
              />
            </a>
            <p className="dg-cvh-funnel__eyebrow">The Hideaway Circle</p>
            <h1>Private offers · First access · Return-stay rewards</h1>
            <p className="dg-cvh-funnel__lede">
              Claim 10% off your next direct stay — and stay connected with the
              Valley.
            </p>
            <ul className="dg-cvh-funnel__trust">
              <li>
                <i>✓</i> 10% off every direct return stay
              </li>
              <li>
                <i>✓</i> First access to seasonal offers
              </li>
              <li>
                <i>✓</i> Member-only rainforest updates
              </li>
            </ul>
          </div>

          <div className="dg-cvh-funnel__panel">{formBody}</div>

          <div className="dg-cvh-funnel__foot">
            <div className="dg-cvh-funnel__brand-icons" aria-label="Currumbin Valley Hideaway">
              <a
                href="https://currumbinvalleyhideaway.com.au"
                target="_blank"
                rel="noopener noreferrer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={CVH_ICON} alt="Currumbin Valley Hideaway" width={48} height={48} />
              </a>
            </div>
            <p>The Hideaway Circle — Currumbin Valley Hideaway members.</p>
          </div>
        </div>
      </section>
    </>
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
};

const printEyebrow: CSSProperties = {
  margin: 0,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  fontSize: "0.7rem",
  color: "#6b5c4c",
};

const printTitle: CSSProperties = {
  margin: "0.75rem 0 0.35rem",
  fontSize: "1.85rem",
  color: "#1a2a24",
};

const printLead: CSSProperties = {
  margin: "0 0 1.25rem",
  color: "#3d4f48",
};

const printBrand: CSSProperties = {
  margin: "0 0 0.35rem",
  fontSize: "1.35rem",
  color: "#1a2a24",
};

const printBody: CSSProperties = {
  margin: 0,
  color: "#3d4f48",
};

const printScan: CSSProperties = {
  margin: "0.5rem 0 0",
  fontWeight: 700,
  color: "#1a2a24",
};

const printUrl: CSSProperties = {
  margin: "0.35rem 0 0",
  fontSize: "0.75rem",
  wordBreak: "break-all",
  color: "#6b5c4c",
};
