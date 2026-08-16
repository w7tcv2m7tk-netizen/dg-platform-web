"use client";

import { useMemo, useState, type FormEvent } from "react";

type Kind = "appraisal" | "buyer_consultation";

type Props = {
  siteSlug: string;
  kind: Kind;
  logoUrl?: string | null;
};

const AGENT_IMAGE =
  "https://dhcfjdm3qhtlfaul.public.blob.vercel-storage.com/org-assets/cmsi1k71w0000jr04ljsf91z2/wp-migrate/3d5dc6cc51ff2c13.png";

const ZOOM_URL =
  "https://us05web.zoom.us/j/9537192432?pwd=lqAE7buBTaal4XeBoAqVa7X9FboTcN.1";

const COPY: Record<
  Kind,
  {
    badge: string;
    headline: string;
    lede: string;
    service: string;
    icon: string;
    trust: [string, string, string];
    description: string[];
  }
> = {
  appraisal: {
    badge: "🏠 FREE PROPERTY APPRAISAL",
    headline: "What's Your Home Worth?",
    lede: "Book a free property appraisal. Get an accurate market valuation, local insights, and honest advice — no obligation.",
    service: "Property Appraisal",
    icon: "📊",
    trust: ["30-Minute Appraisal", "Local Market Data", "No Obligation"],
    description: [
      "Book a free 30-minute property appraisal consultation with Roe Realty.",
      "We'll discuss your property, current market conditions, estimated value, recent comparable sales, and answer any questions about selling in the current market.",
      "No obligation and no pressure.",
    ],
  },
  buyer_consultation: {
    badge: "🔑 FREE BUYER CONSULTATION",
    headline: "Find Your Dream Home",
    lede: "Book a free buyer consultation. Discuss your needs, explore properties, and plan your purchase. No obligation.",
    service: "Buyer Consultation",
    icon: "🔑",
    trust: ["30-Minute Consultation", "Property Search Guidance", "No Obligation"],
    description: [
      "Book a free 30-minute buyer consultation with Roe Realty.",
      "We'll discuss your property needs, explore current listings, review market conditions, and create a tailored property search strategy.",
      "No obligation and no pressure.",
    ],
  },
};

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Weekday 9:00–16:30 every 30 mins (AEST-style local clock). */
function slotsForDate(dateIso: string): string[] {
  if (!dateIso) return [];
  const [y, m, d] = dateIso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dow = date.getDay(); // 0 Sun … 6 Sat
  if (dow === 0) return [];
  const startHour = 9;
  const endHour = dow === 6 ? 12 : 17;
  const slots: string[] = [];
  for (let h = startHour; h < endHour; h++) {
    for (const min of [0, 30]) {
      if (h === endHour - 1 && min === 30 && endHour === 12) continue;
      if (h === 16 && min === 30) continue;
      slots.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
    }
  }
  const now = new Date();
  const isToday =
    now.getFullYear() === y && now.getMonth() === m - 1 && now.getDate() === d;
  if (!isToday) return slots;
  const cutoff = now.getHours() * 60 + now.getMinutes() + 45;
  return slots.filter((t) => {
    const [hh, mm] = t.split(":").map(Number);
    return hh * 60 + mm >= cutoff;
  });
}

function formatSlot(t: string) {
  const [hh, mm] = t.split(":").map(Number);
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = ((hh + 11) % 12) + 1;
  return `${h12}:${String(mm).padStart(2, "0")} ${ampm}`;
}

const FUNNEL_CSS = `
.rr-book {
  --rr-ink: #1C2B2A;
  --rr-muted: #4A5B59;
  --rr-gold: #C9A46C;
  --rr-cream: #F5F2EF;
  --rr-card: #FFFFFF;
  width: 100%;
  background: var(--rr-cream);
  color: var(--rr-ink);
  font-family: "Source Sans 3", system-ui, sans-serif;
  box-sizing: border-box;
  padding: clamp(3.5rem, 8vw, 5rem) clamp(1rem, 4vw, 1.5rem) 3.5rem;
}
.rr-book *, .rr-book *::before, .rr-book *::after { box-sizing: border-box; }
.rr-book__inner { max-width: 1280px; margin: 0 auto; }
.rr-book__intro { text-align: center; max-width: 600px; margin: 0 auto 2.5rem; }
.rr-book__badge {
  display: inline-block;
  background: rgba(201,164,108,.15);
  padding: .25rem 1rem;
  border-radius: 40px;
  font-size: .7rem;
  font-weight: 700;
  color: var(--rr-gold);
  letter-spacing: .08em;
  margin-bottom: 1rem;
}
.rr-book__intro h1 {
  margin: 0 0 .75rem;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(1.85rem, 4vw, 2.25rem);
  font-weight: 600;
  color: var(--rr-ink);
  line-height: 1.2;
}
.rr-book__intro p { margin: 0; font-size: .95rem; color: var(--rr-muted); line-height: 1.6; }
.rr-book__card {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 2.5rem;
  align-items: start;
  background: var(--rr-card);
  border-radius: 24px;
  padding: 2rem 1.75rem;
  border: 1px solid #E0D6CC;
  box-shadow: 0 8px 24px rgba(0,0,0,.04);
}
.rr-book__photo {
  width: 100%;
  max-width: 300px;
  border-radius: 16px;
  display: block;
  margin-bottom: .75rem;
}
.rr-book__agent {
  margin: 0 0 .15rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--rr-ink);
}
.rr-book__agent span { font-weight: 400; color: #6B7A78; font-size: 1rem; }
.rr-book__service {
  margin: .5rem 0 .25rem;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--rr-ink);
}
.rr-book__meta {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: .75rem;
  font-size: .9rem;
  color: var(--rr-muted);
}
.rr-book__meta span { display: inline-flex; align-items: center; gap: .4rem; }
.rr-book__zoom {
  font-size: .9rem;
  color: var(--rr-muted);
  line-height: 1.7;
  margin-bottom: 1rem;
  word-break: break-all;
}
.rr-book__zoom a { color: var(--rr-gold); }
.rr-book__desc {
  background: var(--rr-cream);
  padding: 1rem 1.25rem;
  border-radius: 12px;
  border-left: 4px solid var(--rr-gold);
  font-size: .9rem;
  color: var(--rr-muted);
  line-height: 1.8;
}
.rr-book__desc p { margin: 0 0 .85rem; }
.rr-book__desc p:last-child { margin: 0; }
.rr-book__panel {
  background: #F9F7F5;
  border-radius: 16px;
  padding: 1.5rem 1.25rem;
}
.rr-book__panel-head { text-align: center; margin-bottom: 1.25rem; }
.rr-book__panel-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: rgba(201,164,108,.1);
  border-radius: 50%;
  font-size: 1.5rem;
  margin-bottom: .65rem;
}
.rr-book__panel h3 {
  margin: 0 0 .25rem;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--rr-ink);
}
.rr-book__panel-head p {
  margin: 0;
  font-size: .85rem;
  color: var(--rr-muted);
}
.rr-book__form label {
  display: block;
  font-size: .8rem;
  font-weight: 700;
  color: var(--rr-ink);
  margin: 0 0 .35rem;
}
.rr-book__form .field { margin-bottom: .9rem; }
.rr-book__form input,
.rr-book__form textarea {
  width: 100%;
  padding: .7rem .85rem;
  border: 1px solid #E0D6CC;
  border-radius: 10px;
  background: #fff;
  color: var(--rr-ink);
  font: inherit;
}
.rr-book__form input:focus,
.rr-book__form textarea:focus {
  outline: 2px solid rgba(201,164,108,.45);
  border-color: var(--rr-gold);
}
.rr-book__slots {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  gap: .5rem;
  min-height: 3rem;
}
.rr-book__slot {
  border: 1px solid #E0D6CC;
  background: #fff;
  border-radius: 10px;
  padding: .55rem .35rem;
  font-size: .8rem;
  font-weight: 700;
  color: var(--rr-ink);
  cursor: pointer;
}
.rr-book__slot.is-selected,
.rr-book__slot:hover {
  background: var(--rr-gold);
  border-color: var(--rr-gold);
  color: #fff;
}
.rr-book__slot-empty {
  grid-column: 1 / -1;
  text-align: center;
  color: #8a9694;
  font-size: .85rem;
  padding: .75rem 0;
}
.rr-book__hp {
  position: absolute;
  left: -9999px;
  opacity: 0;
  height: 0;
  width: 0;
  overflow: hidden;
}
.rr-book__error {
  color: #b91c1c;
  font-size: .85rem;
  margin: 0 0 .75rem;
}
.rr-book__ok {
  text-align: center;
  padding: 1.5rem 1rem;
  background: rgba(16,185,129,.1);
  border-radius: 12px;
  color: #065f46;
  font-weight: 600;
  line-height: 1.5;
}
.rr-book__submit {
  width: 100%;
  border: 0;
  border-radius: 40px;
  padding: .9rem 1.25rem;
  background: var(--rr-gold);
  color: #fff;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
}
.rr-book__submit:disabled { opacity: .6; cursor: wait; }
.rr-book__submit:hover:not(:disabled) { background: #B48B56; }
.rr-book__trust {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  flex-wrap: wrap;
  margin-top: 1.85rem;
  font-size: .75rem;
  color: var(--rr-muted);
}
.rr-book__trust span { display: inline-flex; align-items: center; gap: .45rem; }
@media (max-width: 860px) {
  .rr-book__card { grid-template-columns: 1fr; gap: 1.75rem; }
  .rr-book__photo { max-width: 220px; margin-left: auto; margin-right: auto; }
  .rr-book__agent, .rr-book__service, .rr-book__meta { text-align: center; justify-content: center; }
}
`;

export function RoeBookingCapture({ siteSlug, kind, logoUrl }: Props) {
  const copy = COPY[kind];
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const minDate = todayIso();
  const slots = useMemo(() => slotsForDate(date), [date]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!time) {
      setError("Please select an available time.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/public/re-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteSlug,
          kind,
          fullName,
          email,
          phone,
          date,
          time,
          notes,
          website: honeypot,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        data?: { message?: string };
        error?: { message?: string };
      };
      if (!res.ok) {
        setError(json.error?.message || "Could not complete booking.");
        setBusy(false);
        return;
      }
      setDone(json.data?.message || "Thanks — your booking request was received.");
      setBusy(false);
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: FUNNEL_CSS }} />
      <section className="rr-book">
        <div className="rr-book__inner">
          <div className="rr-book__intro">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Roe Realty"
                style={{
                  height: 42,
                  width: "auto",
                  maxWidth: 220,
                  margin: "0 auto 1.25rem",
                  display: "block",
                  objectFit: "contain",
                }}
              />
            ) : null}
            <div className="rr-book__badge">{copy.badge}</div>
            <h1>{copy.headline}</h1>
            <p>{copy.lede}</p>
          </div>

          <div className="rr-book__card">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="rr-book__photo"
                src={AGENT_IMAGE}
                alt="Ben Roe - Roe Realty"
              />
              <h3 className="rr-book__agent">
                Ben Roe <span>| Roe Realty</span>
              </h3>
              <h2 className="rr-book__service">{copy.service}</h2>
              <div className="rr-book__meta">
                <span>🕐 30 Minutes</span>
                <span>💻 Online Meeting</span>
              </div>
              <div className="rr-book__zoom">
                <a href={ZOOM_URL} target="_blank" rel="noreferrer">
                  {ZOOM_URL}
                </a>
              </div>
              <div className="rr-book__desc">
                {copy.description.map((p) => (
                  <p key={p}>
                    {p.startsWith("No obligation") ? <strong>{p}</strong> : p}
                  </p>
                ))}
              </div>
            </div>

            <div className="rr-book__panel">
              <div className="rr-book__panel-head">
                <div className="rr-book__panel-icon" aria-hidden>
                  {copy.icon}
                </div>
                <h3>Select a Time</h3>
                <p>Pick a date and time that works for you</p>
              </div>

              {done ? (
                <p className="rr-book__ok">{done}</p>
              ) : (
                <form className="rr-book__form" onSubmit={onSubmit}>
                  <div className="rr-book__hp" aria-hidden>
                    <label>
                      Website
                      <input
                        value={honeypot}
                        onChange={(e) => setHoneypot(e.target.value)}
                        tabIndex={-1}
                        autoComplete="off"
                      />
                    </label>
                  </div>
                  <div className="field">
                    <label htmlFor="rr-book-name">Full Name *</label>
                    <input
                      id="rr-book-name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      autoComplete="name"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="rr-book-email">Email *</label>
                    <input
                      id="rr-book-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="rr-book-phone">Phone</label>
                    <input
                      id="rr-book-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="tel"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="rr-book-date">Date *</label>
                    <input
                      id="rr-book-date"
                      type="date"
                      min={minDate}
                      value={date}
                      onChange={(e) => {
                        setDate(e.target.value);
                        setTime("");
                      }}
                      required
                    />
                  </div>
                  <div className="field">
                    <label>Available Times *</label>
                    <div className="rr-book__slots" role="listbox" aria-label="Available times">
                      {!date ? (
                        <div className="rr-book__slot-empty">Select a date first</div>
                      ) : slots.length === 0 ? (
                        <div className="rr-book__slot-empty">No slots available</div>
                      ) : (
                        slots.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            role="option"
                            aria-selected={time === slot}
                            className={`rr-book__slot${time === slot ? " is-selected" : ""}`}
                            onClick={() => setTime(slot)}
                          >
                            {formatSlot(slot)}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="rr-book-notes">Notes</label>
                    <textarea
                      id="rr-book-notes"
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                  {error ? <p className="rr-book__error">{error}</p> : null}
                  <button className="rr-book__submit" type="submit" disabled={busy}>
                    {busy ? "Booking…" : "Book Appointment →"}
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="rr-book__trust">
            {copy.trust.map((item, i) => (
              <span key={item}>
                <span aria-hidden>{i === 2 ? "🛡️" : i === 1 ? "📍" : "🕐"}</span>
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
